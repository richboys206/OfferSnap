import Link from "next/link";
import { listPageSlugs, readPage } from "@/lib/content";
import {
  deletePageAction,
  duplicatePageAction,
  importFromUrlAction,
  logoutAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const slugs = listPageSlugs();
  const pages = slugs
    .map((s) => readPage(s))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <h1>Gerenciador de Páginas</h1>
        <div>
          <Link href="/admin/new" className="btn">
            + Nova página
          </Link>{" "}
          <Link href="/checkout" className="btn btn-secondary" target="_blank">
            Ver checkout universal
          </Link>{" "}
          <form action={logoutAction} style={{ display: "inline" }}>
            <button className="btn btn-secondary" type="submit">
              Sair
            </button>
          </form>
        </div>
      </div>

      {params.ok && <div className="alert">{params.ok}</div>}
      {params.erro && (
        <div className="alert" style={{ background: "#fdecea", color: "#c62828" }}>
          {params.erro}
        </div>
      )}

      <div className="card">
        <h3>Importar página da Vaquinha por URL</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
          Cole o link de uma página da Vakinha. A página será buscada e criada
          aqui usando o template padrão, já com o conteúdo (textos e imagens)
          da página original.
        </p>
        <form
          action={importFromUrlAction}
          style={{ display: "flex", gap: 10, marginTop: 12 }}
        >
          <input
            name="url"
            type="url"
            placeholder="https://www.vakinha.com.br/vaquinha/..."
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
        {pages.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Nenhuma página ainda.{" "}
            <Link href="/admin/new">Crie a primeira</Link>.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slug / URL</th>
                <th>Template</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.meta.slug}>
                  <td style={{ fontWeight: 600 }}>{p.meta.name}</td>
                  <td>
                    <Link href={`/${p.meta.slug}`} target="_blank">
                      /{p.meta.slug}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-page">
                      {p.meta.template === "inicio" ? "Vakinha" : p.meta.template}
                    </span>
                  </td>
                  <td className="row-actions">
                    <Link href={`/admin/${p.meta.slug}/edit`}>Editar</Link>
                    <Link href={`/${p.meta.slug}`} target="_blank">
                      Abrir
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await duplicatePageAction(p.meta.slug);
                      }}
                      style={{ display: "inline" }}
                    >
                      <button type="submit" className="link-btn">
                        Duplicar
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await deletePageAction(p.meta.slug);
                      }}
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
      </div>
    </main>
  );
}