"use client";

import { useEffect, useMemo, useRef } from "react";

const PARTICLE_COUNT = 14;

/**
 * Fundo tecnológico dinâmico em azul (cor da marca: #009dff).
 * - Aurora de luz que se move lentamente (animações de transform).
 * - Brilho que acompanha o cursor (apenas pointer fino, sem reduced-motion).
 * - Grid fino + partículas flutuantes.
 * - Puramente decorativo (aria-hidden, pointer-events: none).
 * - Posições determinísticas para evitar mismatch de hidratação.
 * - Respeita prefers-reduced-motion via CSS e JS.
 */
export default function TechBackground({
  variant = "app",
}: {
  variant?: "login" | "app";
}) {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;

    const tick = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      const el = glowRef.current;
      if (el) {
        el.style.transform = `translate3d(${x - 210}px, ${y - 210}px, 0)`;
      }
      const settled = Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (event: MouseEvent) => {
      tx = event.clientX;
      ty = event.clientY;
      glowRef.current?.classList.add("is-active");
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        top: (i * 53 + 7) % 100,
        size: 3 + ((i * 13) % 4),
        delay: (i % 6) * 0.8,
        duration: 9 + ((i * 7) % 6),
      })),
    []
  );

  return (
    <div className={`tech-bg tech-bg--${variant}`} aria-hidden="true">
      <div className="tech-bg__aurora tech-bg__aurora--a" />
      <div className="tech-bg__aurora tech-bg__aurora--b" />
      <div className="tech-bg__grid" />
      {variant === "login" && (
        <>
          <div className="tech-bg__beam tech-bg__beam--a" />
          <div className="tech-bg__beam tech-bg__beam--b" />
          <div className="tech-bg__beam tech-bg__beam--c" />
          <svg
            className="tech-bg__arcs"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="arc-grad-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#009dff" stopOpacity="0" />
                <stop offset="45%" stopColor="#4db8ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#009dff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="arc-grad-b" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b6bcb" stopOpacity="0" />
                <stop offset="50%" stopColor="#38a8ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0b6bcb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="500"
              cy="500"
              r="430"
              stroke="rgba(10, 40, 90, 0.16)"
              strokeWidth="1.4"
              strokeDasharray="1200 900"
              transform="rotate(25 500 500)"
            />
            <circle
              cx="500"
              cy="500"
              r="430"
              stroke="url(#arc-grad-a)"
              strokeWidth="1.6"
              strokeDasharray="900 400"
              transform="rotate(25 500 500)"
            />
            <circle
              cx="500"
              cy="500"
              r="330"
              stroke="rgba(10, 40, 90, 0.13)"
              strokeWidth="1.2"
              strokeDasharray="700 500"
              transform="rotate(-40 500 500)"
            />
            <circle
              cx="500"
              cy="500"
              r="330"
              stroke="url(#arc-grad-b)"
              strokeWidth="1.4"
              strokeDasharray="700 600"
              transform="rotate(-40 500 500)"
            />
            <circle
              cx="500"
              cy="500"
              r="240"
              stroke="rgba(10, 40, 90, 0.11)"
              strokeWidth="1"
              strokeDasharray="500 400"
              transform="rotate(70 500 500)"
            />
            <circle
              cx="500"
              cy="500"
              r="240"
              stroke="url(#arc-grad-a)"
              strokeWidth="1.2"
              strokeDasharray="380 500"
              transform="rotate(70 500 500)"
            />
          </svg>
        </>
      )}
      <div ref={glowRef} className="tech-bg__glow" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="tech-bg__particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}