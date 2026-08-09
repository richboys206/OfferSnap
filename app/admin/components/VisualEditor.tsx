"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  applyField as applyFieldToBody,
  extractFields,
  type PageFields,
} from "./pageFields";

const EDITABLE_SELECTOR =
  "span,img,h1,h2,h3,h4,h5,h6,p,strong,em,li,button,figcaption,div";

export interface QueroAjudarSettings {
  text: string;
  color: string;
  location: "padrao" | "flutuante";
}

export interface VisualEditorHandle {
  applyField: (name: keyof PageFields, value: string) => void;
}

function buildDoc(content: string): Document {
  return new DOMParser().parseFromString(`<body>${content}</body>`, "text/html");
}

function serialize(doc: Document): string {
  return doc.body.innerHTML;
}

interface NodeInfo {
  gid: string;
  tag: string;
  selText: string;
  src: string;
}

function buildInfo(doc: Document): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>();
  const nodes = Array.from(doc.body.querySelectorAll(EDITABLE_SELECTOR));
  nodes.forEach((node, i) => {
    const el = node as HTMLElement;
    const gid = `e${i}`;
    el.dataset.gid = gid;
    const textNodes = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent || "")
      .join(" ")
      .trim();
    const src = (el as HTMLImageElement).src || "";
    map.set(gid, {
      gid,
      tag: el.tagName.toLowerCase(),
      selText: textNodes || el.textContent?.trim() || "",
      src: src && src.startsWith("data:") ? "\u00ad" : src,
    });
  });
  return map;
}

const VisualEditor = forwardRef<
  VisualEditorHandle,
  {
    initial: string;
    checkoutUrl: string;
    onChange: (html: string) => void;
    onFieldsChange?: (fields: PageFields) => void;
    queroAjudar?: QueroAjudarSettings;
  }
>(function VisualEditor(
  { initial, checkoutUrl, onChange, onFieldsChange, queroAjudar },
  ref
) {
  const docRef = useRef<Document | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [info, setInfo] = useState<Map<string, NodeInfo>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draftSrc, setDraftSrc] = useState<string>("");
  const [insertMenu, setInsertMenu] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // DOMParser só existe no browser: monta o documento após a hidratação.
  useEffect(() => {
    docRef.current = buildDoc(initial);
    setPreviewHtml(serialize(docRef.current));
    setInfo(buildInfo(docRef.current));
    onFieldsChange?.(extractFields(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      applyField: (name, value) => {
        const doc = docRef.current!;
        docRef.current = buildDoc(applyFieldToBody(serialize(doc), name, value));
        refresh();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function rebind(doc: Document, el: Element | null): string | null {
    if (!el) return null;
    const nodes = Array.from(doc.body.querySelectorAll(EDITABLE_SELECTOR));
    const idx = nodes.indexOf(el);
    if (idx < 0) return null;
    (el as HTMLElement).dataset.gid = `e${idx}`;
    return `e${idx}`;
  }

  function refresh(opts: { nextSelect?: string | null } = {}): void {
    const doc = docRef.current!;
    const html = serialize(doc);
    if (opts.nextSelect) {
      const el = doc.body.querySelector(`[data-gid="${opts.nextSelect}"]`);
      if (el) {
        (el as HTMLElement).dataset.gid = opts.nextSelect;
      }
    }
    setInfo(buildInfo(doc));
    setPreviewHtml(html);
    onChange(html);
    onFieldsChange?.(extractFields(html));
    setSelected(opts.nextSelect ?? selected);
  }

  function syncFrom(styl: HTMLElement) {
    const gid = styl.dataset.gid;
    if (!gid) return;
    const target = docRef.current!.body.querySelector<HTMLElement>(
      `[data-gid="${gid}"]`
    );
    if (target) target.innerHTML = styl.innerHTML;
    setInfo(buildInfo(docRef.current!));
    onChange(serialize(docRef.current!));
  }

  function setImageSrc(src: string) {
    if (!selected) return;
    const el = docRef.current!.body.querySelector<HTMLElement>(
      `[data-gid="${selected}"]`
    );
    if (el && el.tagName.toLowerCase() === "img") {
      (el as HTMLImageElement).src = src;
      const nextSel = rebind(docRef.current!, el);
      refresh({ nextSelect: nextSel });
    }
  }

  async function uploadImage(file: File) {
    if (!selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/admin/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) setImageSrc(json.url);
    } finally {
      setUploading(false);
    }
  }

  function move(dir: "prev" | "next") {
    if (!selected) return;
    const el = docRef.current!.body.querySelector<HTMLElement>(
      `[data-gid="${selected}"]`
    );
    if (!el || !el.parentNode) return;
    if (dir === "prev") {
      const prev = el.previousElementSibling;
      if (prev) el.parentNode.insertBefore(el, prev);
    } else {
      const next = el.nextElementSibling;
      if (next) el.parentNode.insertBefore(next, el);
    }
    const nextSel = rebind(docRef.current!, el);
    refresh({ nextSelect: nextSel });
  }

  function removeNode() {
    if (!selected) return;
    const el = docRef.current!.body.querySelector(
      `[data-gid="${selected}"]`
    );
    if (el) el.remove();
    setSelected(null);
    refresh();
  }

  function addBlock(
    type: "text" | "image" | "button",
    insertIndex?: number
  ) {
    const doc = docRef.current!;
    const el = doc.createElement("div");
    if (type === "text") {
      el.innerHTML = `<p>Novo texto. Clique para editar.</p>`;
    } else if (type === "image") {
      el.innerHTML = `<img src="/styles/SELO.png" alt="nova imagem" style="max-width:100%"/>`;
    } else {
      el.innerHTML = `<button type="button" onclick="window.location.href='${checkoutUrl || "/checkout"}'"><span>Quero Ajudar</span></button>`;
    }
    const siblings = Array.from(doc.body.children);
    const at =
      typeof insertIndex === "number" && insertIndex >= 0 && insertIndex <= siblings.length
        ? insertIndex
        : siblings.length;
    if (at < siblings.length) {
      doc.body.insertBefore(el, siblings[at]);
    } else {
      doc.body.appendChild(el);
    }
    refresh();
  }

  const sel = selected ? info.get(selected) : undefined;
  const isImage = sel?.tag === "img";
  const editingImage = isImage && selected !== null;

  function commitText(styl: HTMLElement) {
    const gid = styl.dataset.gid;
    styl.contentEditable = "false";
    if (!gid) return;
    const target = docRef.current!.body.querySelector<HTMLElement>(
      `[data-gid="${gid}"]`
    );
    if (target) target.innerHTML = styl.innerHTML;
    const next = rebind(docRef.current!, target);
    refresh({ nextSelect: next ?? gid });
  }

  function startInline(styl: HTMLElement, win: Window) {
    styl.contentEditable = "true";
    styl.focus();
    const range = win.document.createRange();
    range.selectNodeContents(styl);
    const selw = win.getSelection();
    if (selw) {
      selw.removeAllRanges();
      selw.addRange(range);
    }
  }

  const qa = queroAjudar || {
    text: "Quero Ajudar",
    color: "#009dff",
    location: "padrao" as const,
  };
  const qaJson = JSON.stringify(qa).replace(/</g, "\\u003c");

  const previewDoc = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/styles/cdd618e4d06e6581.css" />
<link rel="stylesheet" href="/styles/a29a5c0337d7d678.css" />
<link rel="stylesheet" href="/styles/inline.css" />
<style>
#__next>*{cursor:pointer}
[data-gid]{outline:1px dashed rgba(0,157,255,0);transition:outline-color .12s}
[data-gid]:hover{outline:1px dashed #009dff; outline-offset:1px}
[data-gid] [data-gid]{outline:none}
[contenteditable="true"]{outline:2px solid #009dff !important; outline-offset:2px; cursor:text !important}
.ve-insert{position:relative;display:flex;align-items:center;justify-content:center;height:14px;margin:6px 0;min-width:100%;opacity:0;transition:opacity .12s;cursor:pointer}
.ve-insert:hover,.ve-insert.ve-armed{opacity:1}
.ve-insert::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;background:#cfe6fb;border-radius:2px}
.ve-insert:hover::before,.ve-insert.ve-armed::before{background:#009dff}
.ve-insert::after{content:"+";position:relative;z-index:1;width:22px;height:22px;border-radius:50%;background:#fff;border:1.5px solid #009dff;color:#009dff;font-size:16px;line-height:20px;text-align:center;font-weight:700}
.ve-menu{position:fixed;z-index:9999;background:#fff;border:1px solid var(--border, #dfe5e1);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:6px;display:flex;flex-direction:column;min-width:170px}
.ve-menu button{display:flex;align-items:center;gap:8px;border:none;background:#fff;color:#1f2a24;padding:9px 12px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;text-align:left;font-family:inherit}
.ve-menu button:hover{background:#eef5ff}
.ve-menu button .ve-ico{width:20px;height:20px;border-radius:6px;background:#e3f0ff;color:#009dff;font-weight:700;line-height:20px;text-align:center}
</style></head>
<body>
<div id="__next" style="display:flex;flex-direction:column">${previewHtml}</div>
<script id="qa-settings" type="application/json">${qaJson}</script>
<script>
(function () {
  var s = JSON.parse(document.getElementById('qa-settings').textContent);
  var label = document.querySelector('[data-cy="campaign-toolbar"]');
  if (label) label.textContent = s.text;
  var btn = null;
  var all = document.querySelectorAll('button');
  for (var i = 0; i < all.length; i++) {
    if (all[i].querySelector('[data-cy="campaign-toolbar"]')) { btn = all[i]; break; }
  }
  if (btn) {
    btn.style.background = s.color;
    btn.style.borderColor = s.color;
    btn.style.color = '#ffffff';
    if (s.location === 'flutuante') {
      btn.style.position = 'fixed';
      btn.style.bottom = '24px';
      btn.style.right = '24px';
      btn.style.zIndex = '9999';
      btn.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)';
    } else {
      btn.style.position = '';
      btn.style.bottom = '';
      btn.style.right = '';
      btn.style.zIndex = '';
      btn.style.boxShadow = '';
    }
  }
})();
</script>
</body></html>`;

  const veMenu = (
    <>
      {(
        [
          ["text", "Texto"],
          ["image", "Imagem"],
          ["button", "Botão Quero Ajudar"],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            addBlock(k, insertMenu?.index);
            setInsertMenu(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            background: "#fff",
            color: "#1f2a24",
            padding: "9px 12px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#eef5ff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#fff";
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: "#e3f0ff",
              color: "#009dff",
              fontWeight: 700,
              lineHeight: "20px",
              textAlign: "center",
            }}
          >
            +
          </span>
          {label}
        </button>
      ))}
    </>
  );

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            position: "relative",
            height: 620,
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "auto",
          }}
        >
          <iframe
            srcDoc={previewDoc}
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              const win = iframe.contentWindow;
              if (!win) return;
              const doc = win.document;
              const els = doc.querySelectorAll("[data-gid]");
              for (const item of Array.from(els) as HTMLElement[]) {
                item.addEventListener("click", (ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  const gid = item.dataset.gid || "";
                  setSelected(gid);
                  if (item.tagName.toLowerCase() === "img") {
                    setDraftSrc(item.getAttribute("src") || "");
                  } else {
                    startInline(item, win);
                  }
                });
                item.addEventListener("input", () => syncFrom(item));
                item.addEventListener("keydown", (ev) => {
                  if (ev.key === "Escape" || ev.key === "Enter") {
                    ev.preventDefault();
                    commitText(item);
                  }
                });
                item.addEventListener("blur", () => commitText(item));
              }

              const box = doc.getElementById("__next") as HTMLElement | null;
              if (box) {
                Array.prototype.slice
                  .call(box.children)
                  .forEach((c, i) => {
                    if (i > 0) {
                      const h = doc.createElement("div");
                      h.className = "ve-insert";
                      h.dataset.insertIndex = String(i);
                      box.insertBefore(h, c);
                    }
                  });
                const end = doc.createElement("div");
                end.className = "ve-insert";
                end.dataset.insertIndex = String(box.children.length);
                box.appendChild(end);
                box
                  .querySelectorAll<HTMLElement>(".ve-insert")
                  .forEach((h) => {
                    h.addEventListener("click", (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      const r = h.getBoundingClientRect();
                      const p = (
                        iframe as HTMLIFrameElement
                      ).getBoundingClientRect();
                      setInsertMenu({
                        index: Number(h.dataset.insertIndex || 0),
                        x: p.left + r.left,
                        y: p.top + r.top + 6,
                      });
                    });
                  });
              }
            }}
            style={{ width: "100%", height: "100%", border: "none", minHeight: 620 }}
            title="passe o mouse entre blocos para adicionar; clique em texto/imagem para editar"
          />
          {insertMenu && (
            <div
              className="ve-menu"
              style={{
                position: "fixed",
                left: insertMenu.x,
                top: insertMenu.y,
                zIndex: 1000,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,.15)",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                minWidth: 180,
              }}
              onMouseLeave={() => setInsertMenu(null)}
            >
              {veMenu}
            </div>
          )}
          {editingImage && sel ? (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 100,
                width: 260,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 12,
                boxShadow: "0 8px 30px rgba(0,0,0,.18)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Trocar imagem
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label>URL da imagem</label>
                <input
                  value={draftSrc}
                  onChange={(e) => setDraftSrc(e.target.value)}
                  placeholder="/uploads/imagem.png"
                  autoComplete="off"
                />
              </div>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setImageSrc(draftSrc);
                  setSelected(null);
                }}
                style={{ width: "100%", marginBottom: 8 }}
                disabled={!draftSrc}
              >
                Aplicar URL
              </button>
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Enviar arquivo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    (async () => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", f);
                          const res = await fetch("/admin/api/upload", {
                            method: "POST",
                            body: fd,
                          });
                          const json = await res.json();
                          if (json.url) {
                            setImageSrc(json.url);
                            setSelected(null);
                          }
                        } finally {
                          setUploading(false);
                        }
                        e.target.value = "";
                      }
                    })();
                  }}
                />
              </div>
              <button
                className="btn"
                type="button"
                onClick={() => setSelected(null)}
                style={{ width: "100%" }}
              >
                Fechar
              </button>
              {uploading && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                  Enviando...
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ width: 300, flexShrink: 0 }}>
        <div className="card">
          <h3>Itens da página</h3>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Clique em um texto ou imagem na pré-visualização para editar
            diretamente. Ajustes de posição aqui.
          </p>
          {!sel ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              Nenhum item selecionado.
            </p>
          ) : (
            <>
              {isImage ? (
                <div className="field" style={{ margin: "8px 0" }}>
                  <label>Imagem atual</label>
                  <a
                    href={sel.src && !sel.src.startsWith("data:") ? sel.src : "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, wordBreak: "break-all" }}
                  >
                    {sel.src || "(sem imagem)"}
                  </a>
                </div>
              ) : (
                <div className="field" style={{ margin: "8px 0" }}>
                  <label>Conteúdo do {sel.tag}</label>
                  <textarea
                    value={sel.selText}
                    onChange={(e) => {
                      const el = docRef.current!.body.querySelector<HTMLElement>(
                        `[data-gid="${selected}"]`
                      );
                      if (!el) return;
                      const direct = Array.from(el.childNodes).filter(
                        (n) => n.nodeType === 3
                      );
                      for (const n of direct) el.removeChild(n);
                      el.insertBefore(
                        document.createTextNode(e.target.value),
                        el.firstChild
                      );
                      const nextSel = rebind(docRef.current!, el);
                      refresh({ nextSelect: nextSel });
                    }}
                    style={{ minHeight: 120 }}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn btn-secondary" type="button" onClick={() => move("prev")}>
                  ▲ Mover
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => move("next")}>
                  ▼ Mover
                </button>
              </div>
              <button
                className="btn btn-danger"
                type="button"
                onClick={removeNode}
                style={{ width: "100%", marginTop: 8 }}
              >
                Excluir elemento
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default VisualEditor;