"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "../actions";
import TechBackground from "./TechBackground";
import PlansWidget from "./PlansWidget";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/new", label: "Nova página" },
  { href: "/checkout", label: "Checkout universal", external: true },
];

function titleFor(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/new") return "Nova página";
  if (pathname.startsWith("/admin/") && pathname.endsWith("/edit"))
    return "Editar página";
  return "Dashboard";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    navRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = sidebarRef.current?.querySelectorAll<HTMLElement>(
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
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      previous?.focus?.();
    };
  }, [open]);

  return (
    <>
      <TechBackground variant="app" />
      <div className="shell">
        <aside
          ref={sidebarRef}
          id="shell-sidebar"
          className={`shell-sidebar${open ? " open" : ""}`}
        >
          <div className="shell-brand">
            <img src="/logo.svg" alt="" className="shell-brand-logo" />
            OfferSnap
          </div>
          <nav
            ref={navRef}
            className="shell-nav"
            aria-label="Navegação principal"
            tabIndex={-1}
          >
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const cls = `shell-nav-link${active ? " active" : ""}`;
              return item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cls}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cls}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="shell-sidebar-foot">
            <span className="shell-user">admin</span>
            <form action={logoutAction}>
              <button type="submit" className="link-btn">
                Sair
              </button>
            </form>
          </div>
        </aside>

        {open && (
          <div
            className="shell-overlay"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="shell-main" inert={open}>
          <header className="shell-header">
            <button
              type="button"
              className="shell-burger"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="shell-sidebar"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M2 4.5h14M2 9h14M2 13.5h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1>{titleFor(pathname)}</h1>
            <div className="shell-header-actions">
              <a
                href="/checkout"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Ver checkout
              </a>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-secondary">
                  Sair
                </button>
              </form>
            </div>
          </header>
          <main className="shell-content">{children}</main>
          <footer className="shell-footer">
            <span>© 2026 OfferSnap · Todos os direitos reservados.</span>
            <nav className="shell-footer-links" aria-label="Links legais">
              <Link href="/termos">Termos de uso</Link>
              <Link href="/privacidade">Privacidade</Link>
            </nav>
            <span className="shell-footer-version">v0.1.0</span>
          </footer>
        </div>
      </div>
      <div inert={open}>
        <PlansWidget />
      </div>
    </>
  );
}
