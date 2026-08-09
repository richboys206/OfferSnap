"use client";

import { useEffect, useRef, useState } from "react";
import { formatBR, parseISODate, toLocalDate } from "@/lib/dates";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Grade do mês: células vazias (null) antes do primeiro dia, depois "YYYY-MM-DD". */
function buildGrid(view: Date): (string | null)[] {
  const offset = startOfMonth(view).getDay(); // 0 = domingo
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toLocalDate(new Date(view.getFullYear(), view.getMonth(), day)));
  }
  return cells;
}

export default function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState<"from" | "to" | null>(null);
  const [view, setView] = useState(() => startOfMonth(new Date()));
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const today = toLocalDate(new Date());

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Ao abrir, posiciona o mês e o foco no dia relevante.
  useEffect(() => {
    if (!open) return;
    const target = (open === "from" ? from : to) || today;
    setFocusDate(target);
    setView(startOfMonth(parseISODate(target) ?? new Date()));
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
        ?.focus({ preventScroll: true });
    });
  }, [open, from, to, today]);

  function selectDate(iso: string) {
    if (open === "from") {
      let f = iso;
      let t = to;
      if (t && f > t) {
        const tmp = f;
        f = t;
        t = tmp;
      }
      onChange(f, t);
      setOpen("to");
      setView(startOfMonth(parseISODate(t || f) ?? new Date()));
    } else if (open === "to") {
      let f = from;
      let t = iso;
      if (f && t < f) {
        const tmp = f;
        f = t;
        t = tmp;
      }
      onChange(f, t);
      setOpen(null);
    }
  }

  function moveFocus(delta: number) {
    const base = parseISODate(focusDate || today);
    if (!base) return;
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
    const iso = toLocalDate(next);
    setFocusDate(iso);
    if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
      setView(startOfMonth(next));
    }
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)
        ?.focus({ preventScroll: true });
    });
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(null);
      return;
    }
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocus(moves[e.key]);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusDate) selectDate(focusDate);
    }
  }

  const cells = buildGrid(view);
  const inRange = (iso: string) => Boolean(from && to && iso > from && iso < to);
  const hoverRange = (iso: string) =>
    Boolean(open === "to" && from && hover && iso > from && iso < hover);

  return (
    <div className="drp" ref={rootRef}>
      <div className="drp-field">
        <span>De</span>
        <div className="drp-input-wrap">
          <input
            className="drp-input"
            value={from ? formatBR(from) : ""}
            readOnly
            placeholder="dd/mm/aaaa"
            aria-label="Data inicial de criação"
            onClick={() => setOpen("from")}
            onFocus={() => setOpen("from")}
          />
          {from && (
            <button
              type="button"
              className="drp-clear"
              aria-label="Limpar data inicial"
              onClick={() => onChange("", to)}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="drp-field">
        <span>Até</span>
        <div className="drp-input-wrap">
          <input
            className="drp-input"
            value={to ? formatBR(to) : ""}
            readOnly
            placeholder="dd/mm/aaaa"
            aria-label="Data final de criação"
            onClick={() => setOpen("to")}
            onFocus={() => setOpen("to")}
          />
          {to && (
            <button
              type="button"
              className="drp-clear"
              aria-label="Limpar data final"
              onClick={() => onChange(from, "")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="drp-calendar" role="dialog" aria-label="Calendário de datas">
          <div className="drp-cal-head">
            <button
              type="button"
              className="drp-nav"
              aria-label="Mês anterior"
              onClick={() => setView(addMonths(view, -1))}
            >
              ‹
            </button>
            <span className="drp-cal-title">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              className="drp-nav"
              aria-label="Próximo mês"
              onClick={() => setView(addMonths(view, 1))}
            >
              ›
            </button>
          </div>

          <div className="drp-week">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          <div className="drp-grid" ref={gridRef} onKeyDown={onGridKeyDown}>
            {cells.map((iso, i) => {
              if (!iso) {
                return <span key={i} className="drp-day drp-day--out" aria-hidden="true" />;
              }
              const cls = [
                "drp-day",
                iso === today ? "drp-day--today" : "",
                from && iso === from ? "drp-day--start" : "",
                to && iso === to ? "drp-day--end" : "",
                inRange(iso) ? "drp-day--in" : "",
                hoverRange(iso) ? "drp-day--hover" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  data-date={iso}
                  tabIndex={iso === focusDate ? 0 : -1}
                  onClick={() => selectDate(iso)}
                  onMouseEnter={() => setHover(iso)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setFocusDate(iso)}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}