"use client";

import { useEffect, useRef } from "react";

export default function CheckoutBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const amount = root.querySelector<HTMLInputElement>("#amount");
    const bundle = root.querySelector<HTMLInputElement>("#bundleCheck");
    const heart = root.querySelector<HTMLInputElement>("#bundleHeartCheck");
    const contrib = root.querySelector<HTMLElement>("#contribuicaoLine");
    const total = root.querySelector<HTMLElement>("#totalline");

    function fmt(v: number): string {
      return "R$ " + v.toFixed(2).replace(".", ",");
    }

    function recalc() {
      if (!contrib || !total) return;
      const raw = (amount?.value || "").replace(/\D/g, "");
      const base = raw ? parseFloat(raw) / 100 : 0;
      const bundleOn = (bundle?.checked || heart?.checked) ?? false;
      contrib.textContent =
        "Contribui\u00e7\u00e3o: " + fmt(base);
      total.textContent = "Total: " + fmt(base + (bundleOn ? 4.99 : 0));
    }

    amount?.addEventListener("input", recalc);
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
    recalc();

    return () => {
      amount?.removeEventListener("input", recalc);
      bundle?.removeEventListener("change", recalc);
      heart?.removeEventListener("change", recalc);
    };
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
