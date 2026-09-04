import { applyPageSanitizers, listPageSlugsAsync, normalizeSlug, savePage } from "./content";

function clean(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function firstMatch(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return clean(m[1].trim());
  }
  return "";
}

function metaByName(html: string, name: string): string {
  return firstMatch(html, [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${name}["']`, "i"),
  ]);
}

function extractTitle(html: string): string {
  const og = metaByName(html, "og:title");
  if (og) return og;
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? clean(m[1].trim()) : "";
}

function extractDescription(html: string): string {
  return metaByName(html, "description") || metaByName(html, "og:description");
}

/**
 * Remove de qualquer conteúdo valores de chave Pix/e-mail do tipo
 * <prefix>@vakinha.com.br (ex.: rafinha@vakinha.com.br).
 */
function sanitizePixEmails(s: string): string {
  return s.replace(/[A-Za-z0-9._%+-]+@vakinha\.com\.br/g, "");
}

/** Conjunto padrão de selos exibido no bloco de selos da página. */
const BADGES_HTML = `<div class="sc-dhKdcB gYiotS sc-bf13f7ff-0 dTFoPZ"><div class="sc-dhKdcB bGQyYb" style="display:flex;align-items:center;gap:6px"><img src="https://static.vakinha.com.br/uploads/badge/image/1/top_most_loved_last_day.png?ims=24x24" alt="Selo mais amado do dia" style="width:24px;height:24px"/><img src="https://static.vakinha.com.br/uploads/badge/image/2/top_week_most_loved.png?ims=24x24" alt="Selo mais amado da semana" style="width:24px;height:24px"/><img src="https://static.vakinha.com.br/uploads/badge/image/3/top_most_loved_category.png?ims=24x24" alt="Selo mais amado da categoria" style="width:24px;height:24px"/></div><div class="sc-fqkvVR kTFsLt">Ver selos</div></div>`;

/**
 * Garante o conjunto de selos "mais amado" no bloco de selos (ifWaCc) de uma
 * página importada. Se o bloco estiver vazio ou os selos não existirem, injeta
 * o mesmo conjunto presente na template padrão — assim toda página clonada
 * exibe os selos, mesmo quando a página original não os tinha.
 */
function ensureBadges(body: string): string {
  if (body.includes("top_most_loved_last_day")) return body;
  const emptyBlock = /<div class="sc-dhKdcB ifWaCc"><\/div>/;
  if (emptyBlock.test(body)) {
    return body.replace(emptyBlock, `<div class="sc-dhKdcB ifWaCc">${BADGES_HTML}</div>`);
  }
  return body;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .trim();
}

/**
 * Extrai o conteúdo interno do container <div id="__next">... </div>
 * (HTML SSR renderizado pelo site). Fallback para <body> caso não ache o __next__.
 */
function extractNextBody(html: string): string {
  const marker = 'id="__next"';
  const start = html.indexOf(marker);
  if (start < 0) {
    const b = html.indexOf("<body");
    const be = html.indexOf("</body>");
    if (b < 0 || be < 0) return "";
    return stripTags(html.slice(html.indexOf(">", b) + 1, be));
  }
  const contentStart = html.indexOf(">", start) + 1;
  const bodyEnd = html.lastIndexOf("</body>");
  const limitEnd = bodyEnd > 0 ? bodyEnd : html.length;
  const lastDiv = html.lastIndexOf("</div>", limitEnd);
  const contentEnd = lastDiv > contentStart ? lastDiv : contentStart;
  return stripTags(html.slice(contentStart, contentEnd));
}

function validateUrl(raw: string): URL {
  let s = (raw || "").trim();
  if (!s) throw new Error("Informe a URL da página.");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  if (!u.hostname) throw new Error("URL inválida.");
  return u;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Falha ao acessar a página (HTTP ${res.status})`);
  return res.text();
}

async function uniqueSlug(base: string): Promise<string> {
  const taken = new Set(await listPageSlugsAsync());
  const root = normalizeSlug(base);
  let slug = root;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${root}-${n}`;
    n++;
  }
  return slug;
}

/**
 * Busca uma página vakinha por URL e cria uma página interna a partir do
 * corpo da página-alvo (mantém a estrutura/template padrão já existente).
 */
export async function importFromUrl(rawUrl: string): Promise<{ slug: string; name: string }> {
  const url = validateUrl(rawUrl);
  const html = await fetchHtml(url.toString());
  const body = applyPageSanitizers(ensureBadges(sanitizePixEmails(extractNextBody(html))));
  if (!body || body.length < 50) {
    throw new Error("Não foi possível extrair o conteúdo da página informada.");
  }

  const name = (extractTitle(html).split("|")[0] || "Página importada").trim();
  const title = extractTitle(html) || name;
  const description = extractDescription(html);
  const slug = await uniqueSlug(name);
  const now = new Date().toISOString();

  savePage(
    undefined,
    {
      id: slug,
      slug,
      template: "inicio",
      type: "page",
      name,
      title,
      description,
      checkoutUrl: "/checkout",
      createdAt: now,
      updatedAt: now,
    },
    body
  );

  return { slug, name };
}