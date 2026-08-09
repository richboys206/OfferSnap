"use client";

import { useEffect, useRef, useState } from "react";
import { getPlans } from "@/lib/plans";

function SparkleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"
        fill="currentColor"
      />
      <path
        d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8.5l3.2 3.2L13 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l10 10M13 3L3 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PlansWidget() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    // Foca o primeiro elemento focável (botão fechar) para o trap funcionar
    // também com Shift+Tab logo após abrir.
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable ?? dialogRef.current)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      previous?.focus?.();
    };
  }, [open]);

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (
      event.shiftKey &&
      document.activeElement === dialogRef.current
    ) {
      event.preventDefault();
      last.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="plans-ball"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ver planos de assinatura"
        inert={open}
      >
        <span className="plans-ball__ring" aria-hidden="true" />
        <SparkleIcon />
      </button>

      {open && (
        <div
          className="plans-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="plans-title"
          className="plans-dialog"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
        >
          <header className="plans-header">
            <div>
              <h2 id="plans-title">Planos OfferSnap</h2>
              <p>Escolha o plano que faz sentido para as suas páginas.</p>
            </div>
            <button
              type="button"
              className="plans-close"
              onClick={() => setOpen(false)}
              aria-label="Fechar planos"
            >
              <CloseIcon />
            </button>
          </header>

          <div className="plans-grid">
            {getPlans().map((plan) => (
              <article
                key={plan.id}
                className={`plan-card${plan.highlight ? " plan-card--highlight" : ""}`}
              >
                <div className="plan-card__head">
                  <h3 className="plan-card__name" style={{ color: plan.accent }}>
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="plan-card__badge">Mais popular</span>
                  )}
                </div>
                <p className="plan-card__tagline">{plan.tagline}</p>
                <div className="plan-card__price">
                  <span className="plan-card__value">{plan.price}</span>
                  <span className="plan-card__period">{plan.period}</span>
                </div>
                <ul className="plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="plan-card__cta"
                  disabled={plan.disabled}
                >
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>

          <p className="plans-note">
            Assinatura digital será liberada em breve. Os detalhes dos planos
            ainda podem ser ajustados.
          </p>
        </div>
      )}
    </>
  );
}