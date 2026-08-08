export const COOKIE_NAME = "admin_session";

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toB64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}

export async function createToken(secret: string): Promise<string> {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return `${payload}.${toB64(sig)}`;
}

export async function verifyToken(token: string | undefined | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sigB64] = parts;
  const key = await hmacKey(secret);
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(sigB64, "base64url"),
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
  if (!valid) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function getSecret(): string {
  return process.env.SESSION_SECRET || "gerenciador-local-secret-2026";
}

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || "admin";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123";
}