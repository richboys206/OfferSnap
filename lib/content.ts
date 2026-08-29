import fs from "fs";
import path from "path";

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
    // já semeado?
    if (fs.existsSync(path.join(PAGES_DIR, "vakinha", "page.json"))) return;
    if (!fs.existsSync(SEED_DIR)) return;
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    // Node 16+: cpSync disponível
    const cp = (fs as unknown as { cpSync?: typeof fs.cpSync }).cpSync;
    if (typeof cp === "function") {
      if (fs.existsSync(SEED_PAGES_DIR)) cp(SEED_PAGES_DIR, PAGES_DIR, { recursive: true, force: true });
      if (fs.existsSync(SEED_CHECKOUT_DIR)) cp(SEED_CHECKOUT_DIR, CHECKOUT_DIR, { recursive: true, force: true });
    } else {
      // fallback manual
      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
          const s = path.join(src, entry.name);
          const d = path.join(dest, entry.name);
          if (entry.isDirectory()) copyRecursive(s, d);
          else fs.copyFileSync(s, d);
        }
      };
      copyRecursive(SEED_PAGES_DIR, PAGES_DIR);
      copyRecursive(SEED_CHECKOUT_DIR, CHECKOUT_DIR);
    }
  } catch {
    // silencioso: se falhar, ensureContentDirs cria dirs vazios
  }
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

export function listPageSlugs(): string[] {
  ensureContentDirs();
  return fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => n !== "checkout")
    .sort();
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

export function readPage(slug: string): PageRecord | null {
  const dir = path.join(PAGES_DIR, slug);
  const jsonPath = path.join(dir, "page.json");
  if (!fs.existsSync(jsonPath)) return null;
  const meta: PageMeta = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  ) as PageMeta;
  return {
    meta,
    body: fs.readFileSync(path.join(dir, "body.html"), "utf-8"),
  };
}

export function savePage(
  prev: string | undefined,
  meta: PageMeta,
  body: string
): PageRecord {
  ensureContentDirs();
  const slug = normalizeSlug(meta.slug);
  const metaOut: PageMeta = { ...meta, slug };
  const dir = path.join(PAGES_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "page.json"), JSON.stringify(metaOut, null, 2), "utf-8");
  fs.writeFileSync(path.join(dir, "body.html"), body, "utf-8");
  if (prev && prev !== slug) {
    const prevDir = path.join(PAGES_DIR, stripExt(prev));
    if (fs.existsSync(prevDir) && prevDir !== dir) {
      fs.rmSync(prevDir, { recursive: true, force: true });
    }
  }
  return { meta: metaOut, body };
}

export function deletePage(slug: string): boolean {
  const dir = path.join(PAGES_DIR, stripExt(slug));
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
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

export function readCheckout(): PageRecord {
  ensureContentDirs();
  const jsonPath = path.join(CHECKOUT_DIR, "page.json");
  const meta: PageMeta = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  ) as PageMeta;
  const body = fs.readFileSync(path.join(CHECKOUT_DIR, "body.html"), "utf-8");
  let css = "";
  try {
    css = fs.readFileSync(path.join(CHECKOUT_DIR, "styles.css"), "utf-8");
  } catch {
    css = "";
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