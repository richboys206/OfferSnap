import Link from "next/link";
import { listPageSlugsAsync, readPageAsync } from "@/lib/content";
import { importFromUrlAction } from "../actions";
import PagesManager from "../components/PagesManager";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const slugs = await listPageSlugsAsync();
  const pages = (
    await Promise.all(slugs.map((s) => readPageAsync(s)))
  )
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      slug: p.meta.slug,
      name: p.meta.name,
      template: p.meta.template,
      createdAt: p.meta.createdAt,
    }));

  return (
    <>
      {params.ok && <div className="alert">{params.ok}</div>}
      {params.erro && (
        <div className="alert" style={{ background: "#fdecea", color: "#c62828" }}>
          {params.erro}
        </div>
      )}

      <div className="card">
        <h3>Importar página por URL</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
          Cole o link de uma página que deseja importar. A página será buscada
          e criada aqui usando o template padrão, já com o conteúdo (textos e
          imagens) da página original.
        </p>
        <form
          action={importFromUrlAction}
          style={{ display: "flex", gap: 10, marginTop: 12 }}
        >
          <input
            name="url"
            type="url"
            placeholder="https://exemplo.com.br/pagina-da-campanha"
            autoComplete="off"
            required
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }}
          />
          <button className="btn" type="submit">
            Importar
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Páginas publicadas</h3>
        <PagesManager pages={pages} />
      </div>
    </>
  );
}