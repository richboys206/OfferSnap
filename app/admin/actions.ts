"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  createToken,
  getAdminPassword,
  getAdminUsername,
  getSecret,
  verifyToken,
} from "@/lib/auth";
import {
  deletePage,
  duplicatePage,
  normalizeSlug,
  readPage,
  savePage,
} from "@/lib/content";
import { importFromUrl } from "@/lib/importer";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  if (
    username !== getAdminUsername() ||
    password !== getAdminPassword()
  ) {
    redirect("/admin/login?msg=acesso+negado");
  }
  const token = await createToken(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token, getSecret());
}

function parseRelated(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => normalizeSlug(x))
      .slice(0, 4);
  } catch {
    return [];
  }
}

export async function createPageAction(
  input: Record<string, string>
): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug ?? "");
  savePage(undefined, {
    id: slug,
    slug,
    template: (input.template as "inicio" | "pagamento") || "inicio",
    type: "page",
    name: (input.name ?? "").trim(),
    title: (input.title ?? "").trim(),
    description: (input.description ?? "").trim(),
    checkoutUrl: (input.checkoutUrl ?? "/checkout").trim() || "/checkout",
    related: parseRelated(input.related),
    createdAt: now,
    updatedAt: now,
  }, input.body ?? "");
  redirect(`/admin/${slug}/edit?ok=salvo`);
}

export async function updatePageAction(
  input: Record<string, string>
): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
  const prevSlug = input.prevSlug;
  const existing = readPage(prevSlug);
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug ?? prevSlug);
  savePage(prevSlug, {
    id: slug,
    slug,
    template: existing?.meta.template ?? "inicio",
    type: "page",
    name: (input.name ?? "").trim(),
    title: (input.title ?? "").trim(),
    description: (input.description ?? "").trim(),
    checkoutUrl: (input.checkoutUrl ?? "/checkout").trim() || "/checkout",
    related: parseRelated(input.related),
    createdAt: existing?.meta.createdAt ?? now,
    updatedAt: now,
  }, input.body ?? "");
  redirect(`/admin/${slug}/edit?ok=salvo`);
}

export async function deletePageAction(slug: string) {
  if (!(await isAdmin())) redirect("/admin/login");
  deletePage(slug);
  redirect("/admin?ok=pagina+excluida");
}

export async function duplicatePageAction(slug: string) {
  if (!(await isAdmin())) redirect("/admin/login");
  const out = duplicatePage(slug, `${slug}-copia`);
  if (out) redirect(`/admin/${out.meta.slug}/edit?ok=duplicada`);
  redirect("/admin");
}

export async function importFromUrlAction(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const url = String(formData.get("url") || "").trim();
  let out: { slug: string; name: string } | null = null;
  try {
    out = await importFromUrl(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`/admin?erro=${encodeURIComponent(msg)}`);
  }
  redirect(`/admin/${out.slug}/edit?ok=pagina+importada+por+URL`);
}