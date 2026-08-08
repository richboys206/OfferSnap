import { starterBody } from "@/lib/starter";
import { listPages } from "@/lib/content";
import PageEditor from "../components/PageEditor";
import { createPageAction } from "../actions";

export const dynamic = "force-dynamic";

export default function NewPage() {
  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <h1>Nova página</h1>
        <a href="/admin" className="btn btn-secondary">
          Voltar
        </a>
      </div>

      <PageEditor
        isNew
        submitLabel="Criar página"
        initial={{
          template: "inicio",
          checkoutUrl: "/checkout",
          body: starterBody(),
          related: [],
        }}
        availablePages={listPages().map((p) => ({
          slug: p.meta.slug,
          name: p.meta.name,
        }))}
        action={createPageAction}
      />
    </main>
  );
}