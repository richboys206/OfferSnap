import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    ok: true,
    apiKeyConfigurada: !!process.env.API_KEY,
    mockMode: process.env.MOCK_PAYMENTS === "true" || !process.env.PAYMENT_API_URL,
    paymentApiUrlConfigurada: !!process.env.PAYMENT_API_URL,
  });
}
