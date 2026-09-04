import type { Metadata } from "next";
import {
  applyQueroAjudar,
  applyRelatedCards,
  disableLogoLinks,
  extractRelatedCard,
  readPage,
} from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = readPage(slug)?.meta;
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
  const record = readPage(slug);
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
  const relatedCards = (record.meta.related ?? [])
    .slice(0, 4)
    .map((relatedSlug) => readPage(relatedSlug))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      slug: p.meta.slug,
      ...extractRelatedCard(p.body, p.meta.title),
    }));
  const html = disableLogoLinks(
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