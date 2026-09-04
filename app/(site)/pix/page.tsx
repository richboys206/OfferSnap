import type { Metadata } from "next";
import PixClient from "./PixClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento via Pix | Vaquinhas online",
  description: "Efetue o pagamento para confirmar a contribuição",
};

export default async function PixPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; pix?: string; qr?: string; id?: string; amount?: string }>;
}) {
  const params = await searchParams;
  // Aceita ?code= ou ?pix= (BravoPay copy_paste) e ?qr= (url/base64 do QR)
  const pixCode = params.code || params.pix || "00020101021226810014br.gov.bcb.pix...";
  const qrCode = params.qr || "";
  const transactionId = params.id || "";
  const amount = params.amount ? parseInt(params.amount, 10) : null;

  return <PixClient pixCode={pixCode} qrCode={qrCode} transactionId={transactionId} amountCents={amount} />;
}
