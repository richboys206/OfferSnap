"use client";

/**
 * Extração e aplicação dos campos editáveis da página da vakinha.
 *
 * A página capturada é um HTML estático com classes geradas pela Vakinha.
 * Estes campos são identificados por classe e editados apenas na página
 * atual (nunca no template em geral).
 */

export interface PageFields {
  city: string; // "Porto Alegre / RS" ou "" quando a página não tem cidade
  id: string; // "5639605"
  title: string;
  subtitle: string;
  sobre: string; // innerHTML do bloco "Sobre"
}

export const EMPTY_FIELDS: PageFields = {
  city: "",
  id: "",
  title: "",
  subtitle: "",
  sobre: "",
};

// Classes geradas presentes no corpo capturado das páginas Vakinha.
const CITY_CLASS = "jCjieJ";
const ID_CLASS = "gBNkAM";
const TITLE_CLASS = "eMKAgq";
const SUBTITLE_CLASS = "dlBwvE";
const SOBRE_CLASS = "tFbcg";
const LOCATION_ICON = '[data-testid="LocationOnIcon"]';

function parseDoc(body: string): Document {
  return new DOMParser().parseFromString(`<body>${body}</body>`, "text/html");
}

/**
 * O campo cidade é o div de classe `jCjieJ` que vem depois do ícone de
 * localização. A primeira ocorrência da classe é a categoria
 * ("Saúde / Tratamentos") e não deve ser confundida com a cidade.
 *
 * Páginas sem cidade (ex.: sem ícone de localização) retornam null, para
 * que `hasCityField` seja false e o editor não ofereça o campo.
 */
function findCityEl(doc: Document): HTMLElement | null {
  const icon = doc.querySelector(LOCATION_ICON);
  if (!icon) return null;
  const all = Array.from(doc.querySelectorAll(`.${CITY_CLASS}`)) as HTMLElement[];
  return (
    all.find((el) => {
      const pos = icon.compareDocumentPosition(el);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    }) || null
  );
}

export function extractFields(body: string): PageFields {
  const doc = parseDoc(body || "");
  const cityEl = findCityEl(doc);
  const idEl = doc.querySelector(`.${ID_CLASS}`);
  const titleEl = doc.querySelector(`.${TITLE_CLASS}`);
  const subEl = doc.querySelector(`.${SUBTITLE_CLASS}`);
  const sobreEl = doc.querySelector(`.${SOBRE_CLASS}`);

  // Subtítulo: remove o texto do span "ver tudo" (mantido ao aplicar).
  let subtitle = "";
  if (subEl) {
    const clone = subEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("span").forEach((s) => s.remove());
    subtitle = (clone.textContent || "").trim();
  }

  return {
    city: cityEl ? (cityEl.textContent || "").trim() : "",
    id: idEl ? (idEl.textContent || "").replace(/^ID:\s*/i, "").trim() : "",
    title: titleEl ? (titleEl.textContent || "").trim() : "",
    subtitle,
    sobre: sobreEl ? sobreEl.innerHTML.trim() : "",
  };
}

export function hasCityField(body: string): boolean {
  return findCityEl(parseDoc(body || "")) !== null;
}

function setCity(doc: Document, value: string): boolean {
  const el = findCityEl(doc);
  if (!el) return false;
  el.textContent = value;
  return true;
}

function setId(doc: Document, value: string): boolean {
  const el = doc.querySelector(`.${ID_CLASS}`);
  if (!el) return false;
  el.textContent = `ID: ${value}`;
  return true;
}

function setTitle(doc: Document, value: string): boolean {
  const el = doc.querySelector(`.${TITLE_CLASS}`);
  if (!el) return false;
  el.textContent = value;
  return true;
}

function setSubtitle(doc: Document, value: string): boolean {
  const el = doc.querySelector(`.${SUBTITLE_CLASS}`);
  if (!el) return false;
  // Preserva o span "ver tudo" existente e substitui apenas os nós de texto.
  const span = el.querySelector("span");
  el.textContent = value;
  if (span) el.appendChild(span);
  return true;
}

function setSobre(doc: Document, value: string): boolean {
  const el = doc.querySelector(`.${SOBRE_CLASS}`);
  if (!el) return false;
  el.innerHTML = value;
  return true;
}

/**
 * Aplica os campos no HTML do corpo. Campos sem elemento correspondente
 * (ex.: página sem cidade) são ignorados — retorna false para o chamador
 * poder avisar o usuário.
 */
export function applyField(body: string, name: keyof PageFields, value: string): string {
  const doc = parseDoc(body || "");
  switch (name) {
    case "city":
      setCity(doc, value);
      break;
    case "id":
      setId(doc, value);
      break;
    case "title":
      setTitle(doc, value);
      break;
    case "subtitle":
      setSubtitle(doc, value);
      break;
    case "sobre":
      setSobre(doc, value);
      break;
  }
  return doc.body.innerHTML;
}
