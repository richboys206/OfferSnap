"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deletePageAction, duplicatePageAction } from "../actions";
import { toLocalDate } from "@/lib/dates";
import DateRangePicker from "./DateRangePicker";

export interface PageRow {
  slug: string;
  name: string;
  template: string;
  createdAt: string;
}

function templateLabel(t: string): string {
  return t === "inicio" ? "Vakinha" : t;
}

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function PagesManager({ pages }: { pages: PageRow[] }) {
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Lista de templates derivada dos dados: quando um novo template for usado
  // em páginas futuras, ele aparece automaticamente neste filtro.
  const templates = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) set.add(p.template);
    return Array.from(set).sort();
  }, [pages]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim());
    let f = from;
    let t = to;
    if (f && t && f > t) [f, t] = [t, f];
    return pages.filter((p) => {
      if (template !== "all" && p.template !== template) return false;
      if (q && !normalizeSearch(p.name).includes(q)) return false;
      if (f || t) {
        const d = new Date(p.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        const date = toLocalDate(d);
        if (f && date < f) return false;
        if (t && date > t) return false;
      }
      return true;
    });
  }, [pages, search, template, from, to]);

  const hasActiveFilters =
    search.trim() !== "" || template !== "all" || from !== "" || to !== "";

  function clearFilters() {
    setSearch("");
    setTemplate("all");
    setFrom("");
    setTo("");
  }

  if (pages.length === 0) {
    return (
      <p style={{ color: "var(--muted)" }}>
        Nenhuma página ainda. <Link href="/admin/new">Crie a primeira</Link>.
      </p>
    );
  }

  return (
    <>
      <div className="filters">
        <div className="filters-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pelo nome da página..."
            aria-label="Buscar página pelo nome"
            autoComplete="off"
            className="filters-search"
          />
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            aria-label="Filtrar por template"
            className="filters-select"
          >
            <option value="all">Todos os templates</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                {templateLabel(t)}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="filters-row">
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Limpar
          </button>
        </div>

        <p className="filters-count">
          {filtered.length} de {pages.length} página
          {filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          Nenhuma página encontrada com esses filtros.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug / URL</th>
              <th>Template</th>
              <th>Criada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.slug}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>
                  <Link href={`/${p.slug}`} target="_blank">
                    /{p.slug}
                  </Link>
                </td>
                <td>
                  <span className="badge badge-page">
                    {templateLabel(p.template)}
                  </span>
                </td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>
                  {formatDate(p.createdAt)}
                </td>
                <td className="row-actions">
                  <Link href={`/admin/${p.slug}/edit`}>Editar</Link>
                  <Link href={`/${p.slug}`} target="_blank">
                    Abrir
                  </Link>
                  <form
                    action={duplicatePageAction.bind(null, p.slug)}
                    style={{ display: "inline" }}
                  >
                    <button type="submit" className="link-btn">
                      Duplicar
                    </button>
                  </form>
                  <form
                    action={deletePageAction.bind(null, p.slug)}
                    style={{ display: "inline" }}
                  >
                    <button type="submit" className="link-btn danger">
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}