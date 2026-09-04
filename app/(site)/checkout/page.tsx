import type { Metadata } from "next";
import { disableHeaderLinks, disableLogoLinks, readCheckout, readPageAsync, renderCheckoutTitle } from "@/lib/content";
import CheckoutBody from "./CheckoutBody";

export const dynamic = "force-dynamic";

async function pageTitle(slug: string): Promise<string | null> {
  const page = await readPageAsync(slug);
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
  const title = origem ? await pageTitle(origem) : null;
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
  const title = origem ? await pageTitle(origem) : null;
  const rawBody = title ? renderCheckoutTitle(checkout.body, title) : checkout.body;
  const body = disableHeaderLinks(disableLogoLinks(rawBody));
  return <CheckoutBody html={body} />;
}