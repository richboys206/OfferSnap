"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "../actions";

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

  return (
    <div className="shell">
      <aside className={`shell-sidebar${open ? " open" : ""}`}>
        <div className="shell-brand">
          <span className="shell-logo" aria-hidden="true" />
          OfferSnap
        </div>
        <nav className="shell-nav" aria-label="Navegação principal">
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

      <div className="shell-main">
        <header className="shell-header">
          <button
            type="button"
            className="shell-burger"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
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
      </div>
    </div>
  );
}