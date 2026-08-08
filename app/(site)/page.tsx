import Link from "next/link";
import { listPages, readPage } from "@/lib/content";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const pages = listPages();
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 40,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        background: "#f5f7f6",
        color: "#1b1b1b",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Gerenciador de Páginas</h1>
      <p>
        {pages.length} página(s) publicada(s).{" "}
        <Link href="/admin" style={{ color: "#009d4e" }}>
          Acessar painel
        </Link>
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {pages.map((p) => (
          <li key={p.meta.slug} style={{ margin: "8px 0" }}>
            <Link
              href={`/${p.meta.slug}`}
              style={{ color: "#009d4e", fontWeight: 600 }}
            >
              {p.meta.name || p.meta.slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}