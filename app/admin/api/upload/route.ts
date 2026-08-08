import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ext = path
    .extname(file.name)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".avif"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: `Formato não permitido: ${ext}` }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);

  return NextResponse.json({ url: `/uploads/${name}` });
}