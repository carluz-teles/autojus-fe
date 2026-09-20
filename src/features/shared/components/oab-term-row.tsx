import type { ReactNode } from "react";

// Linha de OAB monitorada (um "termo") — componente ÚNICO usado na aba Termos
// (Configurações) e no passo de OABs do onboarding, pra os cards baterem. Renderiza
// o badge "OAB" (chip verde), o número em fonte mono e o subtítulo (dono / estado);
// o slot direito (`children`) recebe o controle de cada contexto: o toggle de captura
// em Configurações, o botão de remover no onboarding. Puramente apresentacional.
export function OabTermRow({
  value,
  subtitle,
  children,
}: {
  /** OAB já formatada no padrão dos Termos ("SP 347.019") — use formatOabTermo. */
  value: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-line2 hover:bg-hover flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <span
        className="w-[46px] flex-none rounded-md py-[3px] text-center text-[10px] font-semibold"
        style={{
          background: "color-mix(in oklch, var(--primary) 14%, transparent)",
          color: "var(--primary)",
        }}
      >
        OAB
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[13px] font-medium">{value}</span>
        <span className="text-fg3 mt-px block text-[11.5px]">{subtitle}</span>
      </span>
      {children}
    </div>
  );
}
