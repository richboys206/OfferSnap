import { starterBody } from "@/lib/starter";
import { listPages } from "@/lib/content";
import Link from "next/link";
import PageEditor from "../../components/PageEditor";
import { createPageAction } from "../../actions";

export const dynamic = "force-dynamic";

export default function NewPage() {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin" className="back-link">
          ← Voltar ao gerenciador
        </Link>
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
    </>
  );
}