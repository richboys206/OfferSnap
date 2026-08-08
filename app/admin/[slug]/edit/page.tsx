import { listPages, readPage } from "@/lib/content";
import { updatePageAction } from "../../actions";
import PageEditor from "../../components/PageEditor";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { slug } = await params;
  const page = readPage(slug);
  const ok = (await searchParams).ok;

  if (!page) {
    return (
      <main className="admin-shell">
        <div className="admin-topbar">
          <h1>Página não encontrada</h1>
          <a href="/admin" className="btn btn-secondary">
            Voltar
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <h1>Editar: {page.meta.name}</h1>
        <a href="/admin" className="btn btn-secondary">
          Voltar
        </a>
      </div>

      {ok && <div className="alert">{ok}</div>}

      <PageEditor
        submitLabel="Salvar alterações"
        initial={{
          slug: page.meta.slug,
          name: page.meta.name,
          title: page.meta.title,
          description: page.meta.description,
          template: page.meta.template,
          checkoutUrl: page.meta.checkoutUrl,
          body: page.body,
          related: page.meta.related ?? [],
        }}
        availablePages={listPages().map((p) => ({
          slug: p.meta.slug,
          name: p.meta.name,
        }))}
        action={updatePageAction}
      />
    </main>
  );
}