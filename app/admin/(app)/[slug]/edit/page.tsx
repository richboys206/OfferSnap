import Link from "next/link";
import { listPages, readPage } from "@/lib/content";
import { updatePageAction } from "../../../actions";
import PageEditor from "../../../components/PageEditor";

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
      <>
        <p>
          Página não encontrada.{" "}
          <Link href="/admin">Voltar ao dashboard</Link>.
        </p>
      </>
    );
  }

  return (
    <>
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
    </>
  );
}