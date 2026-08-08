import type { Metadata } from "next";
import { readCheckout, readPage, renderCheckoutTitle } from "@/lib/content";
import CheckoutBody from "./CheckoutBody";

export const dynamic = "force-dynamic";

function pageTitle(slug: string): string | null {
  const page = readPage(slug);
  if (!page) return null;
  return page.meta.name?.trim() || page.meta.title?.trim() || null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}): Promise<Metadata> {
  const { origem } = await searchParams;
  const checkout = readCheckout();
  const title = origem ? pageTitle(origem) : null;
  return {
    title: title
      ? `Contribuindo para ${title} | Vaquinhas online`
      : checkout.meta.title || "Checkout",
    description: title
      ? `Doar faz bem e você faz a diferença! Conheça minha vaquinha ${title}`
      : checkout.meta.description || "",
  };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}) {
  const { origem } = await searchParams;
  const checkout = readCheckout();
  const title = origem ? pageTitle(origem) : null;
  const body = title ? renderCheckoutTitle(checkout.body, title) : checkout.body;
  return <CheckoutBody html={body} />;
}