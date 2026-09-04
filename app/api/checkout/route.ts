import { NextRequest, NextResponse } from "next/server";
import { criarCobranca } from "@/lib/payments";

export const dynamic = "force-dynamic";

function parseValor(input: unknown): number | null {
  if (typeof input === "number") return Math.round(input);
  if (typeof input === "string") {
    const cleaned = input.replace(/\D/g, "");
    if (!cleaned) return null;
    return parseInt(cleaned, 10);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.API_KEY) {
      return NextResponse.json({ ok: false, error: "API_KEY não configurada no servidor" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

    const payMode = body.payMode === "card" ? "card" : body.payMode === "pix" ? "pix" : null;
    if (!payMode) return NextResponse.json({ ok: false, error: "payMode deve ser 'pix' ou 'card'" }, { status: 400 });

    const valorCentavos = parseValor(body.valorCentavos ?? body.amount ?? body.valor);
    if (valorCentavos === null || valorCentavos < 500) {
      return NextResponse.json({ ok: false, error: "Valor mínimo é R$ 5,00 (BravoPay exige 500 centavos)" }, { status: 400 });
    }
    if (valorCentavos > 10000000) {
      return NextResponse.json({ ok: false, error: "Valor muito alto" }, { status: 400 });
    }

    const email = String(body.email || body.payer?.email || "").trim();
    const name = String(body.name || body.payer?.name || "").trim();
    const phone = String(body.phone || body.payer?.phone || body.payerPhone || "").trim();
    const slugOrigem = String(body.slugOrigem || body.origem || "").trim() || undefined;

    // Validação básica - nunca confie no frontend
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "E-mail inválido" }, { status: 400 });
    }

    // Transparência: se payMode é card, cobramos card; se pix, cobramos pix. Nunca mascarar.
    if (payMode === "card") {
      const cardNumber = String(body.card?.number || body.cardNumber || "").replace(/\D/g, "");
      if (!cardNumber || cardNumber.length < 13) {
        return NextResponse.json({ ok: false, error: "Número do cartão inválido" }, { status: 400 });
      }
    }

    const result = await criarCobranca({
      valorCentavos,
      slugOrigem,
      payMode,
      payer: { name: name || undefined, email: email || undefined, phone: phone || undefined },
      card: payMode === "card"
        ? {
            number: String(body.card?.number || body.cardNumber || ""),
            holder: String(body.card?.holder || body.cardHolder || ""),
            expiry: String(body.card?.expiry || body.cardExpiry || ""),
            cvv: String(body.card?.cvv || body.cardCvv || ""),
          }
        : undefined,
      bundleChecked: Boolean(body.bundleChecked),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    // Nunca retornar a chave, nem ecoar dados sensíveis
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/checkout] erro interno", e);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}

// Health check interno para validar sem vazar chave
export async function GET() {
  const configured = !!process.env.API_KEY;
  return NextResponse.json({ ok: true, apiKeyConfigurada: configured, mockMode: process.env.MOCK_PAYMENTS === "true" || !process.env.PAYMENT_API_URL });
}
