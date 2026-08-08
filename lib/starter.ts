import fs from "fs";
import path from "path";
import { PAGES_DIR, readPage } from "./content";

/**
 * Corpo inicial de uma nova página: clona o template "vakinha"
 * (padrão da página inicio). Fallback: HTML mínimo caso o template não exista.
 */
export function starterBody(): string {
  const tpl = readPage("vakinha");
  if (tpl) return tpl.body;

  const fallbackPath = path.join(PAGES_DIR, "vakinha", "body.html");
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, "utf-8");
  }

  return `<!-- Template vakinha não encontrado em _content/pages/vakinha/body.html -->
<div class="sc-7a509a5-1 bxtwIv"><header id="headerContainer"><div class="sc-a2bdfa7f-0 byVcz"><div class="sc-dhKdcB cPteSW sc-2d580994-1 glCJBZ"><div class="sc-aXZVg gduZIE"><div class="sc-dhKdcB AgBj sc-2d580994-5 hvNpyd"><a href="/checkout"><svg xmlns="http://www.w3.org/2000/svg" width="125" height="32" viewBox="0 0 151 40"><path fill="#24CA68" d="M6.253 0h30.494a6.27 6.27 0 0 1 4.417 1.839A6.28 6.28 0 0 1 43 6.26V28.96q.001.148-.005.29V40l-8.12-4.775H6.253a6.27 6.27 0 0 1-4.416-1.84A6.28 6.28 0 0 1 0 28.964V6.263a6.28 6.28 0 0 1 1.837-4.421A6.27 6.27 0 0 1 6.253.002z" clip-rule="evenodd"/></svg></a></div></div></div></div></header><div style="padding:28px 16px;font-family:Lato,Arial,sans-serif"><h1 style="font-size:26px">Título da vaquinha</h1><p style="color:#5b6b74">Descreva sua campanha aqui.</p><button type="button" onclick="window.location.href='/checkout'"><span>Quero Ajudar</span></button></div></div>`;
}