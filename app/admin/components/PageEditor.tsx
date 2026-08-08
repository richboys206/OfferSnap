"use client";

import { useRef, useState, useTransition } from "react";
import VisualEditor, {
  type QueroAjudarSettings,
  type VisualEditorHandle,
} from "./VisualEditor";
import CitySelect from "./CitySelect";
import {
  extractFields,
  hasCityField,
  type PageFields,
} from "./pageFields";

export interface EditFormState {
  action: (input: Record<string, string>) => Promise<void>;
  submitLabel: string;
  initial: {
    slug?: string;
    name?: string;
    title?: string;
    description?: string;
    template?: "inicio" | "pagamento";
    checkoutUrl?: string;
    body?: string;
    related?: string[];
  };
  isNew?: boolean;
  previewUrl?: string;
  /** Páginas disponíveis para vincular na seção "Outras histórias". */
  availablePages?: { slug: string; name: string }[];
}

function randomId(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function fieldsEqual(a: PageFields, b: PageFields): boolean {
  return (
    a.city === b.city &&
    a.id === b.id &&
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.sobre === b.sobre
  );
}

export default function PageEditor(props: EditFormState) {
  const [slug, setSlug] = useState(props.initial.slug ?? "");
  const [name, setName] = useState(props.initial.name ?? "");
  const [title, setTitle] = useState(props.initial.title ?? "");
  const [description, setDescription] = useState(
    props.initial.description ?? ""
  );
  const [template, setTemplate] = useState(props.initial.template ?? "inicio");
  const [checkoutUrl, setCheckoutUrl] = useState(
    props.initial.checkoutUrl ?? "/checkout"
  );
  const [body, setBody] = useState(props.initial.body ?? "");
  const [related, setRelated] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, i) => props.initial.related?.[i] ?? "")
  );
  const [fields, setFields] = useState<PageFields>(() =>
    extractFields(props.initial.body ?? "")
  );
  const [queroAjudar, setQueroAjudar] = useState<QueroAjudarSettings>({
    text: "Quero Ajudar",
    color: "#009d4e",
    location: "padrao",
  });
  const [isPending, startTransition] = useTransition();
  const veRef = useRef<VisualEditorHandle>(null);

  const pageHasCity = hasCityField(props.initial.body ?? "");

  function handleFieldsChange(next: PageFields) {
    setFields((prev) => (fieldsEqual(prev, next) ? prev : next));
  }

  function applyField(name: keyof PageFields, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
    veRef.current?.applyField(name, value);
  }

  function runAction() {
    const form: Record<string, string> = {
      prevSlug: props.initial.slug ?? "",
      slug,
      name,
      title,
      description,
      template,
      checkoutUrl,
      body,
      related: JSON.stringify(related.filter(Boolean)),
    };
    startTransition(async () => {
      await props.action(form);
    });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button
          className="btn"
          type="button"
          onClick={runAction}
          disabled={isPending}
        >
          {isPending ? "Salvando..." : props.submitLabel}
        </button>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="slug">Slug (URL)</label>
            <input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: minha-vaquinha"
            />
            <small style={{ color: "var(--muted)" }}>
              {props.isNew
                ? "Defina o endereço da página."
                : "Mudou o slug? A página será movida para o novo endereço."}
            </small>
          </div>
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da vaquinha"
            />
          </div>
          <div className="field">
            <label htmlFor="title">Título (SEO)</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="template">Template</label>
            <select
              id="template"
              value={template}
              onChange={(e) =>
                setTemplate(e.target.value as "inicio" | "pagamento")
              }
            >
              <option value="inicio">Vakinha</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="checkoutUrl">Checkout (URL universal)</label>
            <input
              id="checkoutUrl"
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Descrição (SEO)</label>
            <input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="editor-split">
        <div className="editor-preview">
          <VisualEditor
            ref={veRef}
            initial={body}
            checkoutUrl={checkoutUrl}
            onChange={setBody}
            onFieldsChange={handleFieldsChange}
            queroAjudar={queroAjudar}
          />
        </div>

        <div className="editor-tools">
          <div className="card">
            <h3>Identificação</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              Alterações aplicadas apenas nesta página.
            </p>

            {pageHasCity ? (
              <CitySelect
                value={fields.city}
                onChange={(v) => applyField("city", v)}
              />
            ) : (
              <div className="field">
                <label>Cidade</label>
                <input value={fields.city} disabled placeholder="Sem campo de cidade nesta página" />
                <small style={{ color: "var(--muted)" }}>
                  Esta página não possui o campo cidade no template.
                </small>
              </div>
            )}

            <div className="field">
              <label htmlFor="field-id">ID da vaquinha</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  id="field-id"
                  value={fields.id}
                  onChange={(e) => applyField("id", e.target.value)}
                  placeholder="ID"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => applyField("id", randomId())}
                  title="Gerar ID aleatório"
                >
                  Aleatório
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="field-title">Título</label>
              <input
                id="field-title"
                value={fields.title}
                onChange={(e) => applyField("title", e.target.value)}
                placeholder="Título da vaquinha"
              />
            </div>

            <div className="field">
              <label htmlFor="field-subtitle">Subtítulo</label>
              <textarea
                id="field-subtitle"
                value={fields.subtitle}
                onChange={(e) => applyField("subtitle", e.target.value)}
                placeholder="Resumo exibido abaixo do título"
                style={{ minHeight: 70 }}
              />
            </div>
          </div>

          <div className="card">
            <h3>Sobre</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              Texto da seção "Sobre" da vaquinha.
            </p>
            <div className="field">
              <textarea
                value={fields.sobre}
                onChange={(e) => applyField("sobre", e.target.value)}
                placeholder="Conteúdo da seção Sobre"
                style={{ minHeight: 160, fontFamily: "inherit" }}
              />
            </div>
          </div>

          <div className="card">
            <h3>Quero Ajudar</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              Ajustes apenas na pré-visualização. Não são salvos na página.
            </p>
            <div className="field">
              <label htmlFor="qa-text">Texto do botão</label>
              <input
                id="qa-text"
                value={queroAjudar.text}
                onChange={(e) =>
                  setQueroAjudar((q) => ({ ...q, text: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="qa-color">Cor do botão</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  id="qa-color"
                  type="color"
                  value={queroAjudar.color}
                  onChange={(e) =>
                    setQueroAjudar((q) => ({ ...q, color: e.target.value }))
                  }
                  style={{ width: 44, height: 34, padding: 2 }}
                />
                <input
                  value={queroAjudar.color}
                  onChange={(e) =>
                    setQueroAjudar((q) => ({ ...q, color: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="qa-location">Local</label>
              <select
                id="qa-location"
                value={queroAjudar.location}
                onChange={(e) =>
                  setQueroAjudar((q) => ({
                    ...q,
                    location: e.target.value as QueroAjudarSettings["location"],
                  }))
                }
              >
                <option value="padrao">Padrão (na barra)</option>
                <option value="flutuante">Flutuante (fixo)</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h3>Outras histórias</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              Vincule até 4 páginas para a seção "Outras histórias também
              precisam de você!". Cada card vira um link para a página
              vinculada.
            </p>
            {[0, 1, 2, 3].map((i) => {
              const current = related[i];
              const options = (props.availablePages ?? []).filter(
                (p) => p.slug !== props.initial.slug && p.slug !== current
              );
              return (
                <div className="field" key={i}>
                  <label htmlFor={`related-${i}`}>Card {i + 1}</label>
                  <select
                    id={`related-${i}`}
                    value={current}
                    onChange={(e) =>
                      setRelated((prev) =>
                        prev.map((v, j) => (j === i ? e.target.value : v))
                      )
                    }
                  >
                    <option value="">— Nenhuma página —</option>
                    {current && (
                      <option value={current}>
                        {props.availablePages?.find((p) => p.slug === current)
                          ?.name ?? current}
                      </option>
                    )}
                    {options.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}