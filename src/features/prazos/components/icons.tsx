// Glifos da experiência Prazos, portados do Claude Design. Presentacionais puros
// (só recebem dados derivados). Ícone de prioridade estilo Linear (3 barras, N
// preenchidas), círculo de status por estágio e ícone de origem da fonte.

import type { UrgKey } from "../lib/derivar";
import type { PrazoOrigem, PrazoStage } from "../mocks/prazos.mock";

// Prioridade: 3 barras, preenchidas conforme a urgência (crítico 3, atenção 2,
// tranquilo 1). As não-preenchidas ficam com contorno fino (var(--line)).
export function PrioIcon({ k, size = 15 }: { k: UrgKey; size?: number }) {
  const conf = {
    critico: { n: 3, cor: "var(--red)" },
    atencao: { n: 2, cor: "var(--gold)" },
    tranquilo: { n: 1, cor: "var(--green)" },
  }[k];
  const heights = [6, 10, 14];
  const ys = [12, 8, 4];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21 18"
      style={{ flex: "none" }}
    >
      {heights.map((h, i) => (
        <rect
          key={i}
          x={3 + i * 6}
          y={ys[i]}
          width={3.4}
          height={h}
          rx={1}
          fill={i < conf.n ? conf.cor : "none"}
          stroke={i < conf.n ? "none" : "var(--line)"}
          strokeWidth={1.4}
        />
      ))}
    </svg>
  );
}

// Círculo de status por estágio (tracejado = recebida, preenchido = protocolado…).
export function StatusIcon({ k, size = 15 }: { k: PrazoStage; size?: number }) {
  const c = {
    intimacao: "var(--fg3)",
    confirmar: "var(--gold)",
    confirmado: "var(--blue)",
    elaboracao: "var(--primary)",
    revisao: "var(--gold)",
    protocolado: "var(--green)",
  }[k];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flex: "none" }}
    >
      <circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke={c}
        strokeWidth={2}
        strokeDasharray={k === "intimacao" ? "2.6 2.6" : "none"}
      />
      {k === "confirmado" && <circle cx={12} cy={12} r={4.5} fill={c} />}
      {k === "elaboracao" && (
        <path d="M12 12 L12 3 A9 9 0 0 1 21 12 Z" fill={c} />
      )}
      {k === "revisao" && <path d="M12 12 L12 3 A9 9 0 1 1 3 12 Z" fill={c} />}
      {k === "protocolado" && (
        <>
          <circle cx={12} cy={12} r={9} fill={c} stroke="none" />
          <path
            d="M8.5 12l2.5 2.5 4.5-4.8"
            fill="none"
            stroke="var(--panel)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

const ORIGEM_PATHS: Record<PrazoOrigem, React.ReactNode> = {
  declarado: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  calculado: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h8M8 14h5" />
    </>
  ),
  validado: (
    <>
      <path d="M18 6 7 17l-4-4" />
      <path d="m22 10-7.5 7.5" />
    </>
  ),
  semprazo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  divergente: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </>
  ),
  ia: (
    <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1M12 12l4 8 1.5-3.5L21 15z" />
  ),
};

export function OrigemIcon({
  origem,
  cor,
  size = 12,
}: {
  origem: PrazoOrigem;
  cor: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
    >
      {ORIGEM_PATHS[origem]}
    </svg>
  );
}
