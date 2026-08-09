import Link from "next/link";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export default function LegalPage({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <div className="legal">
      <header className="legal-header">
        <Link href="/admin" className="legal-brand">
          <img src="/logo.svg" alt="" className="legal-brand-logo" />
          OfferSnap
        </Link>
      </header>

      <main className="legal-main">
        <h1>{title}</h1>
        <p className="legal-updated">Última atualização: {updatedAt}</p>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </main>

      <footer className="legal-footer">
        <span>© 2026 OfferSnap · Todos os direitos reservados.</span>
      </footer>
    </div>
  );
}