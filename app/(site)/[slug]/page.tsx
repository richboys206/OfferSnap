import type { Metadata } from "next";
import {
  applyPageSanitizers,
  applyQueroAjudar,
  applyRelatedCards,
  extractRelatedCard,
  readPageAsync,
} from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = (await readPageAsync(slug))?.meta;
  return {
    title: page?.title || "Página",
    description: page?.description || "",
  };
}

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await readPageAsync(slug);
  if (!record) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>404</h1>
        <p>
          Página <code>{slug}</code> não encontrada.{" "}
          <a href="/admin">Ir para o gerenciador</a>
        </p>
      </div>
    );
  }
  const relatedCards = (
    await Promise.all((record.meta.related ?? []).slice(0, 4).map((s) => readPageAsync(s)))
  )
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      slug: p.meta.slug,
      ...extractRelatedCard(p.body, p.meta.title),
    }));
  const html = applyPageSanitizers(
    applyRelatedCards(
      applyQueroAjudar(
        record.body,
        record.meta.checkoutUrl || "/checkout",
        record.meta.slug
      ),
      relatedCards
    )
  );
  return (
    <div
      id="__next"
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}