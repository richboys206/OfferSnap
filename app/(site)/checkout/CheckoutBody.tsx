"use client";

import { useEffect, useRef, useState } from "react";

export default function CheckoutBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const amount = root.querySelector<HTMLInputElement>("#amount");
    const bundle = root.querySelector<HTMLInputElement>("#bundleCheck");
    const heart = root.querySelector<HTMLInputElement>("#bundleHeartCheck");
    const contrib = root.querySelector<HTMLElement>("#contribuicaoLine");
    const total = root.querySelector<HTMLElement>("#totalline");
    // IMPORTANTE: há 2 botões sc-fPXMVe no html (header "Faz uma vaquinha!" e checkout "Contribuir")
    // Pegar só o "Contribuir" pelo texto ou pelo container #iGWHkz
    const btn =
      (Array.from(root.querySelectorAll<HTMLButtonElement>("button.sc-fPXMVe")).find((b) =>
        (b.textContent || "").includes("Contribuir")
      ) as HTMLButtonElement | null) ||
      root.querySelector<HTMLButtonElement>("#iGWHkz button.sc-fPXMVe") ||
      root.querySelector<HTMLButtonElement>("button.sc-fPXMVe.ebXcre");
    const payPix = root.querySelector<HTMLInputElement>("#payRadioPix");
    const payCard = root.querySelector<HTMLInputElement>("#payRadioCard");

    function fmt(v: number): string {
      return "R$ " + v.toFixed(2).replace(".", ",");
    }

    const MIN_CENTAVOS = 1500;
    const MIN_LABEL = "R$ 15,00";

    function getValorCentavos(): number {
      const raw = (amount?.value || "").replace(/\D/g, "");
      const base = raw ? parseInt(raw, 10) : 0;
      const bundleOn = (bundle?.checked || heart?.checked) ?? false;
      return base + (bundleOn ? 499 : 0);
    }

    function ensureMinHintEl(): HTMLElement | null {
      if (!amount || !root) return null;
      let el = root.querySelector<HTMLElement>("#checkoutMinHint");
      if (el) return el;
      el = document.createElement("div");
      el.id = "checkoutMinHint";
      el.textContent = "Valor mínimo: R$ 15,00";
      el.style.cssText =
        "margin-top:6px;font-size:12px;color:#67736c;font-family:Lato,Arial,sans-serif";
      const wrapper = amount.closest("div") || amount.parentElement;
      // verifica se wrapper é o container do input (fyBPlD) — insere após seu parent (cVaWUk)
      const targetParent = wrapper?.parentElement ?? wrapper;
      const anchor = wrapper?.parentElement ? wrapper.parentElement : wrapper;
      if (anchor && anchor.parentElement) {
        // tenta inserir após o bloco do input
        const block = amount.closest(".sc-cWSHoV") || anchor;
        if (block && block.parentElement) block.insertAdjacentElement("afterend", el);
        else anchor.insertAdjacentElement("afterend", el);
      } else if (amount.parentElement) {
        amount.parentElement.insertAdjacentElement("afterend", el);
      } else {
        amount.insertAdjacentElement("afterend", el);
      }
      return el;
    }

    function ensureMinErrorEl(): HTMLElement | null {
      if (!amount || !root) return null;
      let el = root.querySelector<HTMLElement>("#checkoutMinError");
      if (el) return el;
      el = document.createElement("div");
      el.id = "checkoutMinError";
      el.setAttribute("role", "alert");
      el.setAttribute("aria-live", "polite");
      el.style.cssText =
        "margin-top:8px;padding:10px 12px;border-radius:8px;font-family:Lato,Arial,sans-serif;font-size:13px;font-weight:600;background:#FFE6E6;border:1px solid #e74c3c;color:#7a1a1a;display:none";
      // injeta logo abaixo do hint (ou abaixo do input se hint não existir)
      const hint = root!.querySelector<HTMLElement>("#checkoutMinHint");
      if (hint) {
        hint.insertAdjacentElement("afterend", el);
        return el;
      }
      const wrapper = amount.closest("div") || amount.parentElement;
      if (wrapper && wrapper.parentElement) {
        wrapper.parentElement.insertBefore(el, wrapper.nextSibling);
      } else {
        amount.insertAdjacentElement("afterend", el);
      }
      return el;
    }

    function showMinError(show: boolean) {
      const el = ensureMinErrorEl();
      if (!el) return;
      if (show) {
        el.textContent = `Valor mínimo é ${MIN_LABEL}. Por favor, informe um valor igual ou superior a ${MIN_LABEL}.`;
        el.style.display = "block";
        if (amount) {
          amount.style.borderColor = "#e74c3c";
          amount.style.boxShadow = "0 0 0 2px rgba(231,76,60,.15)";
          amount.setAttribute("aria-invalid", "true");
        }
      } else {
        el.style.display = "none";
        if (amount) {
          amount.style.borderColor = "";
          amount.style.boxShadow = "";
          amount.removeAttribute("aria-invalid");
        }
      }
    }

    function recalc() {
      if (!contrib || !total) return;
      const raw = (amount?.value || "").replace(/\D/g, "");
      const base = raw ? parseFloat(raw) / 100 : 0;
      const bundleOn = (bundle?.checked || heart?.checked) ?? false;
      contrib.textContent = "Contribuição: " + fmt(base);
      total.textContent = "Total: " + fmt(base + (bundleOn ? 4.99 : 0));
      updateButtonState();
    }

    function updateButtonState() {
      if (!btn) return;
      // lê estado atual diretamente do DOM para evitar closure stale
      const isLoading = (btn as HTMLButtonElement).dataset.loading === "true";
      const raw = (amount?.value || "").replace(/\D/g, "");
      const base = raw ? parseInt(raw, 10) : 0;
      const habilitado = base >= MIN_CENTAVOS && !isLoading;
      btn.disabled = !habilitado;
      btn.style.pointerEvents = habilitado ? "auto" : "none";
      btn.style.opacity = habilitado ? "1" : "0.6";
      // mensagem inline quando valor >0 mas abaixo do mínimo (base, sem contar turbina)
      const abaixoMinimo = base > 0 && base < MIN_CENTAVOS;
      showMinError(abaixoMinimo);
      // troca classe visual: ebXcre = desabilitado cinza, brsGow = habilitado verde
      if (habilitado) {
        btn.classList.remove("ebXcre");
        btn.classList.add("brsGow");
      } else {
        btn.classList.add("ebXcre");
        btn.classList.remove("brsGow");
      }
    }

    function formatAmountInput() {
      if (!amount) return;
      const raw = amount.value.replace(/\D/g, "");
      if (!raw) {
        amount.value = "";
        return;
      }
      // virgula adicionada automaticamente: 600 -> 6,00 | 6000 -> 60,00
      const formatted = (parseInt(raw, 10) / 100).toFixed(2).replace(".", ",");
      // evita loop se já está formatado
      if (amount.value !== formatted) amount.value = formatted;
    }

    const onAmountInput = () => {
      formatAmountInput();
      recalc();
    };
    // listeners robustos: input + keyup + change
    amount?.addEventListener("input", onAmountInput);
    amount?.addEventListener("keyup", onAmountInput);
    amount?.addEventListener("change", onAmountInput);
    // fallback por polling caso evento não dispare
    const poll = setInterval(updateButtonState, 300);
    if (bundle && heart) {
      const sync = (from: HTMLInputElement, to: HTMLInputElement) => {
        from.addEventListener("change", () => {
          to.checked = from.checked;
          recalc();
        });
      };
      sync(bundle, heart);
      sync(heart, bundle);
    } else {
      bundle?.addEventListener("change", recalc);
      heart?.addEventListener("change", recalc);
    }
    payPix?.addEventListener("change", updateButtonState);
    payCard?.addEventListener("change", updateButtonState);
    // hint estático de valor mínimo (visível sempre)
    ensureMinHintEl();
    ensureMinErrorEl();
    recalc();

    return () => {
      clearInterval(poll);
      amount?.removeEventListener("input", onAmountInput);
      amount?.removeEventListener("keyup", onAmountInput);
      amount?.removeEventListener("change", onAmountInput);
      bundle?.removeEventListener("change", recalc);
      heart?.removeEventListener("change", recalc);
    };
  }, [html, loading]);

  async function handleContribuir() {
    const root = ref.current;
    if (!root) return;
    const amount = root.querySelector<HTMLInputElement>("#amount");
    const bundle = root.querySelector<HTMLInputElement>("#bundleCheck");
    const heart = root.querySelector<HTMLInputElement>("#bundleHeartCheck");
    const payPix = root.querySelector<HTMLInputElement>("#payRadioPix");
    const email = root.querySelector<HTMLInputElement>("#email");
    const name = root.querySelector<HTMLInputElement>("#name");
    const phone = root.querySelector<HTMLInputElement>("#payerPhone");
    const cardNumber = root.querySelector<HTMLInputElement>("#cardNumber");
    const cardHolder = root.querySelector<HTMLInputElement>("#cardHolder");
    const cardExpiry = root.querySelector<HTMLInputElement>("#cardExpiry");
    const cardCvv = root.querySelector<HTMLInputElement>("#cardCvv");
    const btnEl =
      (Array.from(root.querySelectorAll<HTMLButtonElement>("button.sc-fPXMVe")).find((b) =>
        (b.textContent || "").includes("Contribuir")
      ) as HTMLButtonElement | null) ||
      root.querySelector<HTMLButtonElement>("#iGWHkz button.sc-fPXMVe");

    const raw = (amount?.value || "").replace(/\D/g, "");
    const baseCentavos = raw ? parseInt(raw, 10) : 0;
    const bundleOn = (bundle?.checked || heart?.checked) ?? false;
    const valorCentavos = baseCentavos + (bundleOn ? 499 : 0);

    if (baseCentavos < 1500) {
      setMsg("Valor mínimo é R$ 15,00. Por favor, informe um valor igual ou superior a R$ 15,00.");
      setMsgType("error");
      // também mostra erro inline próximo ao input
      const inline = root.querySelector<HTMLElement>("#checkoutMinError");
      if (inline) {
        inline.textContent = "Valor mínimo é R$ 15,00. Por favor, informe um valor igual ou superior a R$ 15,00.";
        inline.style.display = "block";
      }
      const amt = root.querySelector<HTMLInputElement>("#amount");
      if (amt) {
        amt.style.borderColor = "#e74c3c";
        amt.setAttribute("aria-invalid", "true");
        amt.focus();
      }
      return;
    }

    const payMode = payPix?.checked ? "pix" : "card";
    if (payMode === "card") {
      const num = (cardNumber?.value || "").replace(/\D/g, "");
      if (num.length < 13) {
        setMsg("Preencha o número do cartão corretamente");
        setMsgType("error");
        return;
      }
    }

    setLoading(true);
    if (btnEl) btnEl.dataset.loading = "true";
    setMsg(null);
    setMsgType(null);

    try {
      const origem = new URLSearchParams(window.location.search).get("origem") || undefined;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorCentavos,
          payMode,
          origem,
          slugOrigem: origem,
          payer: { name: name?.value, email: email?.value, phone: phone?.value },
          card: payMode === "card"
            ? { number: cardNumber?.value, holder: cardHolder?.value, expiry: cardExpiry?.value, cvv: cardCvv?.value }
            : undefined,
          bundleChecked: bundleOn,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setMsg(data.error || "Erro ao criar cobrança");
        setMsgType("error");
        return;
      }
      if (data.mode === "pix") {
        // redireciona para a nova página de pagamento PIX responsiva (sem alterar template do site clonado)
        const pixCode = (data.pix_copia_cola as string) || (data.pix_qr as string) || "";
        const qr = (data.pix_qr as string) || "";
        const tx = (data.transactionId as string) || "";
        if (pixCode) {
          const params = new URLSearchParams({
            code: pixCode,
            id: tx,
            amount: String(valorCentavos),
          });
          if (qr && qr.length < 2000) params.set("qr", qr);
          window.location.href = `/pix?${params.toString()}`;
          return;
        }
        if (data.mock) {
          setMsg(`PIX MOCK gerado! Valor: R$ ${(valorCentavos / 100).toFixed(2).replace(".", ",")} | Copia e cola: ${data.pix_copia_cola}`);
        } else {
          setMsg(`PIX gerado! Copia e cola: ${data.pix_copia_cola || data.pix_qr || "ver QR Code"}`);
        }
        setMsgType("success");
      } else if (data.mode === "card") {
        if (data.mock) {
          setMsg(`Cartão MOCK aprovado! Valor: R$ ${(valorCentavos / 100).toFixed(2).replace(".", ",")} (teste interno, sem cobrança real)`);
        } else {
          setMsg(`Pagamento com cartão processado! Status: ${data.card_status || "aprovado"}`);
        }
        setMsgType("success");
      }
      // redirecionamento se gateway retornar URL (ex: checkout externo)
      const checkoutUrl = (data as Record<string, unknown>).checkout_url as string | undefined;
      const paymentUrl = (data as Record<string, unknown>).payment_url as string | undefined;
      const redirectUrl = checkoutUrl || paymentUrl || (data as Record<string, unknown>).url as string | undefined;
      if (redirectUrl && typeof redirectUrl === "string" && redirectUrl.startsWith("http")) {
        window.location.href = redirectUrl;
        return;
      }
    } catch {
      setMsg("Erro de rede ao processar pagamento");
      setMsgType("error");
    } finally {
      setLoading(false);
      if (btnEl) btnEl.dataset.loading = "false";
      // força reavaliação do botão (base sem turbina)
      const raw2 = (amount?.value || "").replace(/\D/g, "");
      const cent = raw2 ? parseInt(raw2, 10) : 0;
      if (btnEl) {
        const habilitado2 = cent >= 1500;
        btnEl.disabled = !habilitado2;
        if (habilitado2) { btnEl.classList.remove("ebXcre"); btnEl.classList.add("brsGow"); } else { btnEl.classList.add("ebXcre"); btnEl.classList.remove("brsGow"); }
      }
    }
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const btn =
      (Array.from(root.querySelectorAll<HTMLButtonElement>("button.sc-fPXMVe")).find((b) =>
        (b.textContent || "").includes("Contribuir")
      ) as HTMLButtonElement | null) ||
      root.querySelector<HTMLButtonElement>("#iGWHkz button.sc-fPXMVe");
    if (!btn) return;
    const handler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      handleContribuir();
    };
    btn.addEventListener("click", handler);
    const form = root.querySelector<HTMLFormElement>("form");
    form?.addEventListener("submit", handler);
    return () => {
      btn.removeEventListener("click", handler);
      form?.removeEventListener("submit", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <>
      <div suppressHydrationWarning ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
      {msg && (
        <div
          style={{
            maxWidth: 720,
            margin: "16px auto",
            padding: "12px 16px",
            borderRadius: 8,
            fontFamily: "Lato, Arial, sans-serif",
            fontSize: 14,
            background: msgType === "success" ? "#EEFFE6" : "#FFE6E6",
            border: `1px solid ${msgType === "success" ? "#24ca68" : "#e74c3c"}`,
            color: msgType === "success" ? "#1a5c2e" : "#7a1a1a",
            wordBreak: "break-word",
          }}
          role="status"
          aria-live="polite"
        >
          {msg}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", fontFamily: "Lato, Arial, sans-serif", color: "#67736c", fontSize: 13 }}>
          Processando...
        </div>
      )}
    </>
  );
}
