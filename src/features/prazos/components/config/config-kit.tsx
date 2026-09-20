"use client";

import type { ReactNode } from "react";

// Kit visual das Configurações — primitivos compartilhados pra dar a MESMA
// linguagem do onboarding em todas as páginas: gradiente primário→latão, fio de
// luz, cards de estatística, pílulas de status e banner-herói. Só apresentação;
// animações via utilities `reveal`/`reveal-stagger` do globals.css (transform/
// opacity, respeitam prefers-reduced-motion).

export const BRAND_GRADIENT =
  "linear-gradient(135deg, var(--primary), var(--gold))";

/** Tom semântico das pílulas/realces. */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_VAR: Record<Tone, string> = {
  success: "var(--green)",
  warning: "var(--gold)",
  danger: "var(--red)",
  info: "var(--blue)",
  neutral: "var(--fg3)",
};

/** Cabeçalho de seção — título display + subtítulo, com fio de luz no topo. */
export function SettingsSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="reveal">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-[20px] leading-tight font-medium">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-fg3 mt-1 max-w-[460px] text-[12.5px] leading-[1.5]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Pílula de status compacta — bolinha + rótulo, colorida pelo tom. */
export function StatusPill({
  label,
  tone = "neutral",
  pulse = false,
}: {
  label: string;
  tone?: Tone;
  pulse?: boolean;
}) {
  const c = TONE_VAR[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
      style={{
        color: c,
        background: `color-mix(in oklch, ${c} 14%, transparent)`,
      }}
    >
      <span
        className={`size-1.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ background: c }}
      />
      {label}
    </span>
  );
}

export interface StatCard {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}

/** Grade de estatísticas — cards com leve véu em degradê e número display. */
export function StatGrid({
  cards,
  cols = 3,
}: {
  cards: StatCard[];
  cols?: 2 | 3;
}) {
  return (
    <div
      className={`reveal-stagger mb-[18px] grid grid-cols-1 gap-2.5 ${
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      }`}
    >
      {cards.map((c) => {
        const accent = TONE_VAR[c.tone ?? "neutral"];
        return (
          <div
            key={c.label}
            className="surface-panel relative min-w-0 overflow-hidden px-[15px] py-[13px]"
            style={{
              backgroundImage: `radial-gradient(120% 100% at 0% 0%, color-mix(in oklch, ${accent} 7%, transparent), transparent 60%)`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px] rounded-full opacity-70"
              style={{ background: accent }}
            />
            <div className="text-fg3 mb-[5px] text-[11px]">{c.label}</div>
            <div className="font-display text-[22px] leading-none font-medium tabular-nums">
              {c.value}
            </div>
            {c.sub ? (
              <div className="text-fg3 mt-[5px] text-[10.5px]">{c.sub}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Banner-herói com gradiente da marca — usado pra destacar um valor/ação-chave
 * (ex.: "conecte o tribunal → autos importam sozinhos"). */
export function HeroBanner({
  icon,
  title,
  children,
  action,
  tone = "primary",
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "primary" | "success";
}) {
  const base = tone === "success" ? "var(--green)" : "var(--primary)";
  return (
    <div
      className="reveal relative mb-5 flex items-start gap-3.5 overflow-hidden rounded-2xl border p-4"
      style={{
        borderColor: `color-mix(in oklch, ${base} 22%, var(--line))`,
        backgroundImage: `radial-gradient(90% 120% at 0% 0%, color-mix(in oklch, ${base} 12%, transparent), transparent 55%), radial-gradient(80% 120% at 100% 0%, color-mix(in oklch, var(--gold) 8%, transparent), transparent 50%)`,
      }}
    >
      {icon ? (
        <span
          className="text-primary-foreground grid size-9 flex-none place-items-center rounded-xl shadow-sm"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        {children ? (
          <div className="text-fg2 mt-1 text-[12.5px] leading-[1.55]">
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="flex-none self-center">{action}</div> : null}
    </div>
  );
}
