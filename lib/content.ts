import fs from "fs";
import path from "path";

// Blob opcional para persistência durável em produção (evita perda de páginas clonadas após redeploy/lambda frio)
// Só ativa se BLOB_READ_WRITE_TOKEN estiver configurado no Vercel
let blobSupported: boolean | null = null;
async function getBlobSupport(): Promise<boolean> {
  if (blobSupported !== null) return blobSupported;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    blobSupported = false;
    return false;
  }
  try {
    await import("@vercel/blob");
    blobSupported = true;
    return true;
  } catch {
    blobSupported = false;
    return false;
  }
}

const SEED_DIR = path.join(process.cwd(), "_content");
// Vercel filesystem é read-only em /var/task — escrita só em /tmp (efêmero)
export const CONTENT_DIR = process.env.VERCEL
  ? path.join("/tmp", "_content")
  : path.join(process.cwd(), "_content");
export const PAGES_DIR = path.join(CONTENT_DIR, "pages");
export const CHECKOUT_DIR = path.join(CONTENT_DIR, "checkout");
const SEED_PAGES_DIR = path.join(SEED_DIR, "pages");
const SEED_CHECKOUT_DIR = path.join(SEED_DIR, "checkout");

function seedFromRepoIfNeeded() {
  if (CONTENT_DIR === SEED_DIR) return;
  try {
    if (!fs.existsSync(SEED_DIR)) return;
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    // Sincroniza incrementalmente: copia apenas páginas do seed que ainda não existem em /tmp
    // Isso corrige o bug onde apenas checava vakinha e novas páginas clonadas ficavam com 404 após deploy
    if (fs.existsSync(SEED_PAGES_DIR)) {
      fs.mkdirSync(PAGES_DIR, { recursive: true });
      for (const entry of fs.readdirSync(SEED_PAGES_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const src = path.join(SEED_PAGES_DIR, entry.name);
        const dest = path.join(PAGES_DIR, entry.name);
        // Se a página ainda não existe em /tmp, copia do repo
        if (!fs.existsSync(path.join(dest, "page.json")) && fs.existsSync(path.join(src, "page.json"))) {
          const cp = (fs as unknown as { cpSync?: typeof fs.cpSync }).cpSync;
          if (typeof cp === "function") {
            cp(src, dest, { recursive: true, force: true });
          } else {
            // fallback manual para um diretório
            const copyRecursive = (s: string, d: string) => {
              fs.mkdirSync(d, { recursive: true });
              for (const e of fs.readdirSync(s, { withFileTypes: true })) {
                const sp = path.join(s, e.name);
                const dp = path.join(d, e.name);
                if (e.isDirectory()) copyRecursive(sp, dp);
                else fs.copyFileSync(sp, dp);
              }
            };
            copyRecursive(src, dest);
          }
        }
      }
    }
    // Checkout: garante que existe em /tmp e está atualizado (força sync se seed mudou)
    if (fs.existsSync(SEED_CHECKOUT_DIR)) {
      let shouldSync = false;
      const seedJson = path.join(SEED_CHECKOUT_DIR, "page.json");
      const destJson = path.join(CHECKOUT_DIR, "page.json");
      const seedBody = path.join(SEED_CHECKOUT_DIR, "body.html");
      const destBody = path.join(CHECKOUT_DIR, "body.html");
      if (!fs.existsSync(destJson) || !fs.existsSync(destBody)) {
        shouldSync = true;
      } else {
        try {
          const sBody = fs.readFileSync(seedBody, "utf-8");
          const dBody = fs.readFileSync(destBody, "utf-8");
          // se seed contém o guard de mínimo e destino não, ou conteúdos diferem, sincroniza
          if (sBody !== dBody) shouldSync = true;
        } catch {
          shouldSync = true;
        }
      }
      if (shouldSync) {
        const cp = (fs as unknown as { cpSync?: typeof fs.cpSync }).cpSync;
        if (typeof cp === "function") {
          cp(SEED_CHECKOUT_DIR, CHECKOUT_DIR, { recursive: true, force: true });
        } else {
          fs.mkdirSync(CHECKOUT_DIR, { recursive: true });
          for (const e of fs.readdirSync(SEED_CHECKOUT_DIR, { withFileTypes: true })) {
            const sp = path.join(SEED_CHECKOUT_DIR, e.name);
            const dp = path.join(CHECKOUT_DIR, e.name);
            if (e.isDirectory()) {
              fs.mkdirSync(dp, { recursive: true });
              for (const f of fs.readdirSync(sp, { withFileTypes: true })) {
                fs.copyFileSync(path.join(sp, f.name), path.join(dp, f.name));
              }
            } else fs.copyFileSync(sp, dp);
          }
        }
      }
    }
  } catch {
    // silencioso: se falhar, ensureContentDirs cria dirs vazios
  }
}

// ── Blob helpers (persistência durável) ──
async function saveToBlob(slug: string, meta: PageMeta, body: string): Promise<void> {
  if (!(await getBlobSupport())) return;
  try {
    const { put } = await import("@vercel/blob");
    const base = `pages/${slug}`;
    await put(`${base}/page.json`, JSON.stringify(meta, null, 2), { access: "public", addRandomSuffix: false, contentType: "application/json" });
    await put(`${base}/body.html`, body, { access: "public", addRandomSuffix: false, contentType: "text/html; charset=utf-8" });
  } catch {
    // silencioso: blob é best-effort, filesystem já salvou
  }
}

async function readFromBlob(slug: string): Promise<PageRecord | null> {
  if (!(await getBlobSupport())) return null;
  try {
    const { list } = await import("@vercel/blob");
    const prefix = `pages/${slug}/`;
    const res = await list({ prefix });
    const jsonBlob = res.blobs.find((b) => b.pathname === `${prefix}page.json`);
    const bodyBlob = res.blobs.find((b) => b.pathname === `${prefix}body.html`);
    if (!jsonBlob || !bodyBlob) return null;
    const [metaRes, bodyRes] = await Promise.all([fetch(jsonBlob.url), fetch(bodyBlob.url)]);
    if (!metaRes.ok || !bodyRes.ok) return null;
    const meta = (await metaRes.json()) as PageMeta;
    const rawBody = await bodyRes.text();
    return { meta, body: applyPageSanitizers(rawBody) };
  } catch {
    return null;
  }
}

async function listSlugsFromBlob(): Promise<string[]> {
  if (!(await getBlobSupport())) return [];
  try {
    const { list } = await import("@vercel/blob");
    const res = await list({ prefix: "pages/" });
    const slugs = new Set<string>();
    for (const b of res.blobs) {
      const m = b.pathname.match(/^pages\/([^/]+)\//);
      if (m) slugs.add(m[1]);
    }
    return Array.from(slugs);
  } catch {
    return [];
  }
}

async function deleteFromBlob(slug: string): Promise<void> {
  if (!(await getBlobSupport())) return;
  try {
    const { del, list } = await import("@vercel/blob");
    const res = await list({ prefix: `pages/${slug}/` });
    const urls = res.blobs.map((b) => b.url);
    if (urls.length) await del(urls);
  } catch {}
}

export type TemplateKind = "inicio" | "pagamento";

export interface PageMeta {
  id: string;
  slug: string;
  template: TemplateKind;
  type: "page" | "checkout";
  name: string;
  title: string;
  description: string;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
  /** Slugs das páginas exibidas na seção "Outras histórias também precisam de você!" (até 4). */
  related?: string[];
}

export interface PageRecord {
  meta: PageMeta;
  body: string;
}

export function ensureContentDirs() {
  seedFromRepoIfNeeded();
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  fs.mkdirSync(CHECKOUT_DIR, { recursive: true });
}

function stripExt(slug: string): string {
  return slug.replace(/\.html?$/, "").replace(/[\\/]+/g, "").replace(/^\.+/, "");
}

export function normalizeSlug(raw: string): string {
  const s = (raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stripExt(s) || "pagina";
}

function isDeletedMarker(slug: string): boolean {
  if (CONTENT_DIR === SEED_DIR) return false;
  const marker = path.join(CONTENT_DIR, ".deleted", `${normalizeSlug(slug)}.json`);
  return fs.existsSync(marker);
}

export function listPageSlugs(): string[] {
  ensureContentDirs();
  const fromTmp = new Set<string>();
  try {
    for (const e of fs.readdirSync(PAGES_DIR, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "checkout") fromTmp.add(e.name);
    }
  } catch {}
  // Fallback: também considera páginas que existem no repo mas ainda não foram copiadas para /tmp
  // Garante que páginas clonadas nunca dão 404 mesmo se /tmp foi limpo ou seed falhou
  if (CONTENT_DIR !== SEED_DIR) {
    try {
      for (const e of fs.readdirSync(SEED_PAGES_DIR, { withFileTypes: true })) {
        if (e.isDirectory() && e.name !== "checkout") fromTmp.add(e.name);
      }
    } catch {}
  }
  // Remove páginas marcadas como deletadas (evita ressuscitar após delete via gerenciador)
  if (CONTENT_DIR !== SEED_DIR) {
    for (const slug of Array.from(fromTmp)) {
      if (isDeletedMarker(slug)) fromTmp.delete(slug);
    }
  }
  return Array.from(fromTmp).sort();
}

export function listPages(): PageRecord[] {
  return listPageSlugs()
    .map((slug) => {
      try {
        return readPage(slug);
      } catch {
        return null;
      }
    })
    .filter((p): p is PageRecord => p !== null);
}

export function fixAccents(body: string): string {
  // Corrige mojibake double-encoded (ex: "contribuiÃ§Ã£o" -> "contribuição") quando presente
  if (!body || !body.includes("Ã")) return body;
  // Só corrige se contém sequências típicas de double
  if (body.includes("Ã§") || body.includes("Ã£") || body.includes("Ã¡") || body.includes("Ã©") || body.includes("Ã­") || body.includes("Ã³") || body.includes("Ãú")) {
    try {
      const fixed = Buffer.from(body, "latin1").toString("utf8");
      // Verifica se corrigiu sem quebrar (ex: não deve introduzir �)
      if (!fixed.includes("�") || body.includes("�")) return fixed;
      return fixed;
    } catch {
      return body;
    }
  }
  return body;
}

export function removePixKeySection(body: string): string {
  if (!body || !body.includes("Pix usando a chave")) return body;
  let out = body;
  // Variação 1: checkout antigo iSEAiO
  out = out.replace(/<div class="sc-f294cd4b-0 iSEAiO">[\s\S]*?Você pode ajudar via Pix usando a chave:[\s\S]*?<\/span>\s*<\/div>/g, "");
  // Variação 2: produto "Você também pode <strong>contribuir via Pix usando a chave:</strong>" + botão Copiar
  out = out.replace(/<div class="sc-fqkvVR grIjCO">Você também pode[\s\S]*?Pix usando a chave:[\s\S]*?<\/div>\s*<\/div>\s*<div class="sc-dhKdcB jiaHsX[\s\S]*?<button[^>]*>[\s\S]*?Copiar[\s\S]*?<\/button>[\s\S]*?<\/div>\s*<\/div>/g, "");
  // Fallback genérico
  if (out.includes("Pix usando a chave")) {
    out = out.replace(/<div[^>]*>[\s\S]*?Pix usando a chave:[\s\S]*?<\/button>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, "");
    out = out.replace(/Você[^<]*Pix usando a chave:[^<]*<\/div>[\s\S]*?<\/div>/g, "");
  }
  return out;
}

export function removeCopyVakinhaLink(body: string): string {
  if (!body || !body.includes("copyVakinhaLink")) return body;
  let out = body;
  out = out.replace(/<div id="copyVakinhaLinkWrap"[\s\S]*?<\/script>\s*/g, "");
  out = out.replace(/<div id="copyVakinhaLinkWrap"[\s\S]*?<\/div>\s*<\/div>/g, "");
  out = out.replace(/copyVakinhaLinkBtn/g, "");
  return out;
}

export function applyPageSanitizers(body: string): string {
  // ordem: corrige acentos, remove logo, remove header links, remove pix/copy, guard de mínimo
  let out = fixAccents(body);
  out = disableLogoLinks(out);
  out = disableHeaderLinks(out);
  out = removePixKeySection(out);
  out = removeCopyVakinhaLink(out);
  // "Copiar link da vakinha" removido a pedido (compartilhar já copia URL)
  out = injectCheckoutMinGuard(out);
  return out;
}

export function readPage(slug: string): PageRecord | null {
  const safe = normalizeSlug(slug);
  // Se foi deletada explicitamente, não ressuscita do seed
  if (isDeletedMarker(safe)) return null;
  // 1) tenta em /tmp (ou _content local)
  let dir = path.join(PAGES_DIR, safe);
  let jsonPath = path.join(dir, "page.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const meta: PageMeta = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as PageMeta;
      const rawBody = fs.readFileSync(path.join(dir, "body.html"), "utf-8");
      return { meta, body: applyPageSanitizers(rawBody) };
    } catch {
      // cai para fallback
    }
  }
  // 2) fallback para o repo seed (_content em /var/task) — garante que páginas do repo nunca dão 404
  if (CONTENT_DIR !== SEED_DIR) {
    dir = path.join(SEED_PAGES_DIR, safe);
    jsonPath = path.join(dir, "page.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const meta: PageMeta = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as PageMeta;
        const rawBody = fs.readFileSync(path.join(dir, "body.html"), "utf-8");
        // Copia sob demanda para /tmp para próximas leituras ficarem rápidas
        try {
          seedFromRepoIfNeeded();
          const dest = path.join(PAGES_DIR, safe);
          if (!fs.existsSync(path.join(dest, "page.json"))) {
            fs.mkdirSync(dest, { recursive: true });
            fs.copyFileSync(jsonPath, path.join(dest, "page.json"));
            const srcBody = path.join(dir, "body.html");
            if (fs.existsSync(srcBody)) fs.copyFileSync(srcBody, path.join(dest, "body.html"));
          }
        } catch {}
        return { meta, body: applyPageSanitizers(rawBody) };
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function savePage(
  prev: string | undefined,
  meta: PageMeta,
  body: string
): PageRecord {
  ensureContentDirs();
  const slug = normalizeSlug(meta.slug);
  // Se estava marcada como deletada, remove o marker ao recriar
  if (CONTENT_DIR !== SEED_DIR) {
    const marker = path.join(CONTENT_DIR, ".deleted", `${slug}.json`);
    if (fs.existsSync(marker)) fs.rmSync(marker, { force: true });
  }
  const metaOut: PageMeta = { ...meta, slug };
  const dir = path.join(PAGES_DIR, slug);
  const sanitized = applyPageSanitizers(body);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "page.json"), JSON.stringify(metaOut, null, 2), "utf-8");
  fs.writeFileSync(path.join(dir, "body.html"), sanitized, "utf-8");
  // Persistência durável em Blob (best-effort, não bloqueia)
  void saveToBlob(slug, metaOut, sanitized);
  if (prev && prev !== slug) {
    const prevDir = path.join(PAGES_DIR, stripExt(prev));
    if (fs.existsSync(prevDir) && prevDir !== dir) {
      fs.rmSync(prevDir, { recursive: true, force: true });
    }
  }
  return { meta: metaOut, body: sanitized };
}

export function deletePage(slug: string): boolean {
  const safe = normalizeSlug(slug);
  let deleted = false;
  const dir = path.join(PAGES_DIR, safe);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    deleted = true;
  }
  // Marca como deletada para não ressuscitar do seed em fallback (quando CONTENT_DIR !== SEED_DIR)
  // Isso garante que delete via gerenciador persista mesmo com fallback para /var/task
  if (CONTENT_DIR !== SEED_DIR) {
    try {
      const markerDir = path.join(CONTENT_DIR, ".deleted");
      fs.mkdirSync(markerDir, { recursive: true });
      fs.writeFileSync(path.join(markerDir, `${safe}.json`), JSON.stringify({ slug: safe, deletedAt: new Date().toISOString() }), "utf-8");
      deleted = true;
    } catch {}
  }
  // Local dev (CONTENT_DIR === SEED_DIR): deleta direto do seed
  if (CONTENT_DIR === SEED_DIR) {
    const seedDir = path.join(SEED_PAGES_DIR, safe);
    if (fs.existsSync(seedDir)) {
      fs.rmSync(seedDir, { recursive: true, force: true });
      deleted = true;
    }
  }
  void deleteFromBlob(safe);
  return deleted;
}

export function duplicatePage(slug: string, newSlug: string): PageRecord | null {
  const src = readPage(slug);
  if (!src) return null;
  const target = normalizeSlug(newSlug);
  const now = new Date().toISOString();
  const meta: PageMeta = {
    ...src.meta,
    id: target,
    slug: target,
    name: `${src.meta.name} (cópia)`,
    createdAt: now,
    updatedAt: now,
  };
  return savePage(undefined, meta, src.body);
}

// ── Async wrappers com Blob (para uso em Server Components) ──
export async function readPageAsync(slug: string): Promise<PageRecord | null> {
  const sync = readPage(slug);
  if (sync) return sync;
  const fromBlob = await readFromBlob(slug);
  if (fromBlob) {
    try {
      const dir = path.join(PAGES_DIR, normalizeSlug(slug));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "page.json"), JSON.stringify(fromBlob.meta, null, 2), "utf-8");
      fs.writeFileSync(path.join(dir, "body.html"), fromBlob.body, "utf-8");
    } catch {}
    return fromBlob;
  }
  return null;
}

export async function listPageSlugsAsync(): Promise<string[]> {
  const sync = new Set(listPageSlugs());
  const blobSlugs = await listSlugsFromBlob();
  for (const s of blobSlugs) {
    if (!isDeletedMarker(s)) sync.add(s);
  }
  return Array.from(sync).sort();
}

export async function listPagesAsync(): Promise<PageRecord[]> {
  const slugs = await listPageSlugsAsync();
  const out: PageRecord[] = [];
  for (const slug of slugs) {
    const p = await readPageAsync(slug);
    if (p) out.push(p);
  }
  return out;
}

export function injectCheckoutMinGuard(body: string): string {
  if (!body || !body.includes('id="amount"')) return body;
  if (body.includes("checkoutMinGuard")) return body;
  const guard = `<script id="checkoutMinGuard">
(function(){
  var MIN=1500;
  var LABEL="R$ 15,00";
  function ready(fn){if(document.readyState!=="loading")fn();else document.addEventListener("DOMContentLoaded",fn);}
  ready(function(){
    var amount=document.getElementById("amount");
    var bundle=document.getElementById("bundleCheck");
    var heart=document.getElementById("bundleHeartCheck");
    var btn=(function(){
      var all=Array.from(document.querySelectorAll("button.sc-fPXMVe"));
      var b=all.find(function(x){return (x.textContent||"").indexOf("Contribuir")>-1;});
      return b||document.querySelector("#iGWHkz button.sc-fPXMVe")||document.querySelector("button.sc-fPXMVe.ebXcre");
    })();
    if(!amount||!btn) return;
    if(!document.getElementById("checkoutMinHint")){
      var hint=document.createElement("div");
      hint.id="checkoutMinHint";
      hint.textContent="Valor mínimo: "+LABEL;
      hint.style.cssText="margin-top:6px;font-size:12px;color:#67736c;font-family:Lato,Arial,sans-serif";
      var block=amount.closest(".sc-cWSHoV")||amount.closest("div");
      if(block&&block.parentElement) block.insertAdjacentElement("afterend",hint);
      else amount.insertAdjacentElement("afterend",hint);
    }
    if(!document.getElementById("checkoutMinError")){
      var err=document.createElement("div");
      err.id="checkoutMinError";
      err.setAttribute("role","alert");
      err.style.cssText="display:none;margin-top:8px;padding:10px 12px;border-radius:8px;font-family:Lato,Arial,sans-serif;font-size:13px;font-weight:600;background:#FFE6E6;border:1px solid #e74c3c;color:#7a1a1a";
      var hint2=document.getElementById("checkoutMinHint");
      if(hint2) hint2.insertAdjacentElement("afterend",err);
      else amount.insertAdjacentElement("afterend",err);
    }
    var errEl=document.getElementById("checkoutMinError");
    function showErr(show){
      if(!errEl) return;
      if(show){
        errEl.textContent="Valor mínimo é "+LABEL+". Por favor, informe um valor igual ou superior a "+LABEL+".";
        errEl.style.display="block";
        amount.style.borderColor="#e74c3c";
        amount.style.boxShadow="0 0 0 2px rgba(231,76,60,.15)";
        amount.setAttribute("aria-invalid","true");
      } else {
        errEl.style.display="none";
        amount.style.borderColor="";
        amount.style.boxShadow="";
        amount.removeAttribute("aria-invalid");
      }
    }
    function getBase(){
      var raw=(amount.value||"").replace(/\\D/g,"");
      return raw?parseInt(raw,10):0;
    }
    function update(){
      var base=getBase();
      var isLoading=btn.dataset.loading==="true";
      var habilitado=base>=MIN && !isLoading;
      btn.disabled=!habilitado;
      btn.style.pointerEvents=habilitado?"auto":"none";
      btn.style.opacity=habilitado?"1":"0.6";
      if(habilitado){btn.classList.remove("ebXcre");btn.classList.add("brsGow");}
      else {btn.classList.add("ebXcre");btn.classList.remove("brsGow");}
      var abaixo=base>0 && base<MIN;
      showErr(abaixo);
    }
    function format(){
      var raw=amount.value.replace(/\\D/g,"");
      if(!raw){amount.value="";return;}
      var f=(parseInt(raw,10)/100).toFixed(2).replace(".",",");
      if(amount.value!==f) amount.value=f;
    }
    amount.addEventListener("input",function(){format();update();});
    amount.addEventListener("keyup",function(){format();update();});
    amount.addEventListener("change",function(){format();update();});
    if(bundle) bundle.addEventListener("change",update);
    if(heart) heart.addEventListener("change",update);
    setInterval(update,300);
    update();
    var form=amount.closest("form");
    if(form){
      form.addEventListener("submit",function(e){
        var base=getBase();
        if(base>0 && base<MIN){
          e.preventDefault();e.stopPropagation();
          showErr(true);
          amount.focus();
        }
      });
    }
    btn.addEventListener("click",function(e){
      var base=getBase();
      if(base>0 && base<MIN){
        e.preventDefault();e.stopPropagation();
        showErr(true);
      }
    },true);
  });
})();
</script>`;
  if (body.includes("</form>")) return body.replace("</form>", guard + "</form>");
  return body + guard;
}

export function readCheckout(): PageRecord {
  ensureContentDirs();
  // tenta /tmp primeiro, fallback para repo
  let jsonPath = path.join(CHECKOUT_DIR, "page.json");
  let bodyPath = path.join(CHECKOUT_DIR, "body.html");
  let cssPath = path.join(CHECKOUT_DIR, "styles.css");
  if (!fs.existsSync(jsonPath) && CONTENT_DIR !== SEED_DIR) {
    jsonPath = path.join(SEED_CHECKOUT_DIR, "page.json");
    bodyPath = path.join(SEED_CHECKOUT_DIR, "body.html");
    cssPath = path.join(SEED_CHECKOUT_DIR, "styles.css");
  }
  const meta: PageMeta = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as PageMeta;
  const rawBody = fs.readFileSync(bodyPath, "utf-8");
  // Checkout: corrige acentos, remove header links, injeta guard de mínimo
  let body = fixAccents(rawBody);
  body = disableLogoLinks(body);
  body = disableHeaderLinks(body);
  body = injectCheckoutMinGuard(body);
  let css = "";
  try {
    css = fs.readFileSync(cssPath, "utf-8");
  } catch {
    try {
      css = fs.readFileSync(path.join(CHECKOUT_DIR, "styles.css"), "utf-8");
    } catch {
      css = "";
    }
  }
  return { meta, body: css ? `${body}\n<style id="__jsx-1632331453">${css}</style>` : body };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Garante que o botão "Quero Ajudar" da página aponte para o checkout universal
 * configurado (checkoutUrl), levando a origem (slug) para que o checkout exiba
 * o título/texto da vakinha de onde o visitante veio.
 */
export function applyQueroAjudar(
  body: string,
  checkoutUrl: string,
  slug: string
): string {
  const label = "Quero Ajudar";
  const idx = body.indexOf(label);
  if (idx < 0) return body;
  const btnStart = body.lastIndexOf("<button", idx);
  if (btnStart < 0) return body;
  const tagEnd = body.indexOf(">", btnStart);
  if (tagEnd < 0) return body;
  const target = `${checkoutUrl}${
    checkoutUrl.includes("?") ? "&" : "?"
  }origem=${encodeURIComponent(slug)}`;
  const tag = body.slice(btnStart, tagEnd);
  const cleanTag = tag.replace(/\sonclick="[^"]*"/g, "");
  const newTag = `${cleanTag.replace(/>$/, "")} onclick="window.location.href='${escapeAttr(
    target
  )}'">`;
  return body.slice(0, btnStart) + newTag + body.slice(tagEnd + 1);
}

/**
 * Substitui o título/heading da vakinha (o primeiro <h1>) no corpo do checkout
 * pelo título da vakinha de origem, mantendo todo o restante do layout intacto.
 */
export function renderCheckoutTitle(body: string, title: string): string {
  const safe = escapeHtml(title);
  return body.replace(
    /<h1([^>]*)>[\s\S]*?<\/h1>/i,
    `<h1$1>${safe}</h1>`
  );
}

export interface RelatedCard {
  slug: string;
  title: string;
  image: string;
  /** Texto exibido do valor arrecadado, ex.: "R$ 125.677,14". */
  raisedText: string;
  /** Texto exibido da meta, ex.: "de R$ 500.000,00". */
  goalText: string;
  /** Meta compacta para exibição no card, ex.: "de 500 mil". */
  goalCompact: string;
  /** Percentual arrecadado (0–100+) para a barra de progresso. */
  percent: number;
}

/** Converte "R$ 125.677,14" (ou "de R$ 500.000,00") em número. */
function parseBRL(text: string): number | null {
  const m = text.match(/([\d.]+),(\d{2})/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "") + "." + m[2]);
  return Number.isFinite(n) ? n : null;
}

/** Formata número com vírgula decimal e até 1 casa quando fracionário. */
function formatNum(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace(".", ",");
}

/**
 * Formata um valor em reais de forma compacta, no padrão da Vakinha:
 * "de 15 mil", "de 47,9 mil", "de 500 mil", "de 1,3 mi".
 * Valores abaixo de mil mantêm o formato completo "R$ 885,00".
 */
function formatCompactBRL(value: number): string {
  if (value >= 1_000_000) {
    return `${formatNum(value / 1_000_000)} mi`;
  }
  if (value >= 1_000) {
    return `${formatNum(value / 1_000)} mil`;
  }
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Extrai o título (primeiro <h1>), a imagem de capa (primeiro <img> que não
 * seja selo/badge/logo) e os valores de arrecadação ("Arrecadado R$ X" e
 * "de R$ Y") do body de uma página, para montar o card da seção
 * "Outras histórias também precisam de você!".
 */
export function extractRelatedCard(
  body: string,
  fallbackTitle: string
): { title: string; image: string; raisedText: string; goalText: string; goalCompact: string; percent: number } {
  let title = fallbackTitle;
  const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = h1[1].replace(/<[^>]+>/g, "").trim();
    if (t) title = t;
  }
  let image = "";
  const imgRe = /<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(body)) !== null) {
    const src = m[1];
    if (src.startsWith("data:")) continue;
    if (/badge|selo|logo|icon/i.test(src)) continue;
    image = src;
    break;
  }
  let raisedText = "";
  let goalText = "";
  let goalCompact = "";
  let percent = 0;
  const money = body.match(
    /Arrecadado<\/div><div[^>]*>([^<]+)<\/div><\/div><div[^>]*>([^<]+)<\/div>/i
  );
  if (money) {
    raisedText = money[1].trim();
    goalText = money[2].trim();
    const raised = parseBRL(raisedText);
    const goal = parseBRL(goalText);
    if (raised !== null && goal !== null && goal > 0) {
      percent = Math.round((raised / goal) * 1000) / 10;
      goalCompact = `de ${formatCompactBRL(goal)}`;
    }
  }
  return { title, image, raisedText, goalText, goalCompact, percent };
}

/**
 * Remove o link do logo Vakinha no cabeçalho (e rodapé) das páginas clonadas.
 * O logo originalmente vem como <a href="/"><svg ...logo...></svg></a> ou
 * <a href="https://www.vakinha.com.br/"><svg ...></svg></a>. Clicar enviava
 * para "/" que no OfferSnap é o gerenciador. Esta função neutraliza apenas
 * esses links de logo, preservando todos os demais <a> da página.
 */
export function disableLogoLinks(body: string): string {
  if (!body || !body.includes("headerContainer")) return body;
  // Substitui ancoras que envolvem diretamente o SVG do logo Vakinha
  // Detecta logo pelos atributos/tamanho/viewBox específicos ou pelo path característico
  return body.replace(
    /<a\b[^>]*href\s*=\s*["'](?:\/|https?:\/\/(?:www\.)?vakinha\.com\.br\/?)["'][^>]*>\s*(<svg[^>]*>[\s\S]*?<\/svg>)\s*<\/a>/gi,
    (match, svg: string) => {
      const isLogo =
        svg.includes("M6.253") ||
        svg.includes("M5.11") ||
        svg.includes("M2.368") ||
        svg.includes('viewBox="0 0 151 40"') ||
        svg.includes('viewBox="0 0 123 32"') ||
        svg.includes('viewBox="0 0 57 15"') ||
        svg.includes('width="125"') ||
        svg.includes('width="170"') ||
        svg.includes('width="91"');
      if (!isLogo) return match;
      return `<span data-logo-disabled="true" style="display:contents;cursor:default;pointer-events:none">${svg}</span>`;
    }
  );
}

/**
 * Remove TODOS os links do cabeçalho (headerContainer) — o usuário pediu para
 * o header não ter nenhum link clicável que leve para fora ou para o gerenciador.
 * Converte <a ...>...</a> dentro do <header id="headerContainer"> para <span> sem href/target/rel e com pointer-events:none.
 */
export function disableHeaderLinks(body: string): string {
  if (!body || !body.includes('headerContainer')) return body;
  return body.replace(/<header[^>]*id="headerContainer"[^>]*>[\s\S]*?<\/header>/gi, (header) => {
    let out = header.replace(/<a(\s[^>]*?)>/gi, (m, attrs) => {
      const cleaned = attrs
        .replace(/\s*href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s*target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s*rel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<span${cleaned} data-header-link-disabled="true" style="pointer-events:none;cursor:default;display:contents">`;
    });
    out = out.replace(/<\/a>/gi, "</span>");
    return out;
  });
}

/**
 * Injeta abaixo do botão "Copiar" (ou abaixo do bloco Quero Ajudar como fallback)
 * um botão que copia o link atual da vakinha (window.location.href) e mostra
 * "Link da vakinha copiado!" — atende ao pedido de ter um botão de copiar link do site.
 */
export function injectCopyVakinhaLinkButton(body: string): string {
  if (!body || body.includes("copyVakinhaLinkBtn")) return body;
  const buttonHtml = `
<div id="copyVakinhaLinkWrap" style="margin-top:12px">
  <button type="button" id="copyVakinhaLinkBtn" style="width:100%;background:#fff;border:1px solid #24ca68;color:#24ca68;border-radius:8px;padding:12px 14px;font-weight:700;font-size:14px;font-family:'Lato',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#24ca68" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"></path></svg>
    Copiar link da vakinha
  </button>
  <div id="copyVakinhaFeedback" style="display:none;margin-top:8px;background:#EEFFE6;border:1px solid #24ca68;color:#1a5c2e;padding:10px 12px;border-radius:8px;font-size:13px;font-family:'Lato',sans-serif;text-align:center;font-weight:600">Link da vakinha copiado!</div>
</div>
<script>
(function(){
  var btn=document.getElementById('copyVakinhaLinkBtn');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var text=window.location.href;
    function show(){var fb=document.getElementById('copyVakinhaFeedback'); if(!fb) return; fb.style.display='block'; setTimeout(function(){fb.style.display='none'}, 2600); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(show).catch(function(){
        var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); show();}catch(e){} document.body.removeChild(ta);
      });
    } else {
      var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); show();}catch(e){} document.body.removeChild(ta);
    }
  });
})();
</script>`;
  // Tenta injetar logo após o botão inferior "Copiar" (pix) — ponto mais próximo do pedido "abaixo do botão de compra em 'copiar'"
  if (body.includes('data-cy="copy-pix-key-bottom"')) {
    return body.replace(/(<button[^>]*data-cy="copy-pix-key-bottom"[^>]*>[\s\S]*?<\/button>)/, `$1${buttonHtml}`);
  }
  // Fallback: após o bloco dos botões Quero Ajudar / Compartilhar
  const marker = '<div class="sc-jXbUNg dttRqJ"></div>';
  if (body.includes(marker)) {
    return body.replace(marker, `${buttonHtml}${marker}`);
  }
  return body + buttonHtml;
}

/**
 * Substitui os 4 quadrados vazios (skeleton `sc-fBWQRz cdBohW`) da seção
 * "Outras histórias também precisam de você!" por cards clicáveis que apontam
 * para as páginas relacionadas do próprio gerenciador. Cada card exibe a
 * imagem de capa, o título, o valor arrecadado, a meta e a barra de progresso
 * de doação, no mesmo padrão visual da Vakinha. Cards excedentes ou ausentes
 * permanecem como estavam (vazios).
 */
export function applyRelatedCards(body: string, cards: RelatedCard[]): string {
  if (!cards.length) return body;
  const re = /<div class="sc-fBWQRz cdBohW"[^>]*><\/div>/g;
  let i = 0;
  return body.replace(re, (match) => {
    const card = cards[i++];
    if (!card) return match;
    const href = `/${card.slug}`;
    const title = escapeHtml(card.title);
    const img = card.image ? escapeAttr(card.image) : "";
    const raised = escapeHtml(card.raisedText || "");
    const goal = escapeHtml(card.goalCompact || card.goalText || "");
    const width = Math.min(100, Math.max(0, card.percent || 0));
    return `<a href="${href}" class="related-card" style="display:block;text-decoration:none;color:inherit;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);height:100%">${
      img
        ? `<img src="${img}" alt="${title}" loading="lazy" style="width:100%;height:152px;object-fit:cover;display:block"/>`
        : ""
    }<div style="padding:12px;display:flex;flex-direction:column;gap:8px">${
      title
        ? `<div style="font-weight:700;font-size:14px;line-height:1.35;color:#282828;font-family:'Montserrat','Montserrat Fallback',arial,sans-serif">${title}</div>`
        : ""
    }${
      raised || goal
        ? `<div style="display:flex;align-items:baseline;gap:6px"><span style="font-weight:700;font-size:16px;line-height:1.2;color:#24ca68;font-family:'Lato',arial,sans-serif">${raised}</span><span style="font-size:14px;line-height:1.2;color:#8a8a8a;font-family:'Lato',arial,sans-serif">${goal}</span></div>`
        : ""
    }${
      raised || goal
        ? `<div style="height:4px;background:#f1f0f0;border-radius:0;overflow:hidden"><div style="height:4px;width:${width}%;background:#24ca68;border-radius:16px"></div></div>`
        : ""
    }</div></a>`;
  });
}