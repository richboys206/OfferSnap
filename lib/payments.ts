// lib/payments.ts - SOMENTE SERVER SIDE - BravoPay https://bravopay.club/api/v1
function getApiKey(): string {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API_KEY não configurada");
  return key;
}
function getApiUrl(): string | null {
  const url = process.env.PAYMENT_API_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export type CheckoutPayload = {
  valorCentavos: number;
  slugOrigem?: string;
  payMode: "pix" | "card";
  payer: { name?: string; email?: string; phone?: string; cpf?: string };
  card?: { number?: string; holder?: string; expiry?: string; cvv?: string };
  bundleChecked?: boolean;
};

export type CheckoutResult =
  | { ok: true; mode: "pix"; pix_qr?: string; pix_copia_cola?: string; transactionId?: string; mock?: boolean; gatewayResponse?: unknown }
  | { ok: true; mode: "card"; card_status?: string; transactionId?: string; mock?: boolean; gatewayResponse?: unknown }
  | { ok: false; error: string };

export async function criarCobranca(payload: CheckoutPayload): Promise<CheckoutResult> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();

  if (!apiUrl || process.env.MOCK_PAYMENTS === "true") {
    console.log(`[payments] MOCK pix=${payload.payMode} valor=${payload.valorCentavos} origem=${payload.slugOrigem}`);
    if (payload.payMode === "pix") {
      return { ok: true, mode: "pix", mock: true, pix_qr: "mock_qr_base64", pix_copia_cola: "00020101021226830014BR.GOV.BCB.PIX...MOCK" };
    }
    return { ok: true, mode: "card", mock: true, card_status: "approved_mock" };
  }

  // BravoPay: POST /transactions
  const endpoint = `${apiUrl}/transactions`;
  const idempotencyKey = crypto.randomUUID();

  // Produto exige amount_cents >= 1500 (R$ 15,00) — BravoPay mínimo é 500, mas regra de negócio é 1500
  const amount_cents = payload.valorCentavos;

  const body: Record<string, unknown> = {
    amount_cents,
    method: payload.payMode, // pix | card
    customer: {
      ...(payload.payer.email ? { email: payload.payer.email } : {}),
      ...(payload.payer.name ? { name: payload.payer.name } : {}),
      ...(payload.payer.phone ? { phone: payload.payer.phone } : {}),
      ...(payload.payer.cpf ? { cpf: payload.payer.cpf } : {}),
    },
    description: payload.slugOrigem ? `Doação ${payload.slugOrigem}` : "Doação",
    metadata: {
      origem: payload.slugOrigem,
      bundle: payload.bundleChecked ? "true" : "false",
    },
    external_reference: payload.slugOrigem ? `${payload.slugOrigem}-${Date.now()}` : undefined,
  };
  // limpa customer vazio
  if (Object.keys(body.customer as object).length === 0) delete (body as Record<string, unknown>).customer;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } })?.error;
    let msg = err?.message || (data as { message?: string })?.message || `Gateway erro ${res.status}`;
    // BravoPay retorna 401 com "Invalid or missing API key..." quando API_KEY local é mock
    if (res.status === 401) {
      msg = `API key inválida no ambiente atual (${process.env.VERCEL ? "Vercel" : "local"}). Verifique se API_KEY está como bp_live_... em https://vercel.com/.../settings/environment-variables - Detalhe: ${msg}`;
    }
    return { ok: false, error: msg };
  }

  const pix = (data as { pix?: { copy_paste?: string; qr_code?: string } }).pix;
  const id = (data as { id?: string }).id;
  const status = (data as { status?: string }).status;

  if (payload.payMode === "pix") {
    return {
      ok: true,
      mode: "pix",
      pix_qr: pix?.qr_code,
      pix_copia_cola: pix?.copy_paste,
      transactionId: id,
      gatewayResponse: data,
    };
  }
  return { ok: true, mode: "card", card_status: status, transactionId: id, gatewayResponse: data };
}
