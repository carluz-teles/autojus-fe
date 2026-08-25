// Badge de estado da peça — 5 possibilidades: Rascunho, Revisada, Assinada,
// Aguardando protocolo, Protocolada. Cores casam com o print de referência:
// dourado (rascunho/aguardando), azul (revisada), verde (assinada/protocolada).

export type EstadoPeca =
  "rascunho" | "revisada" | "assinada" | "aguardando_protocolo" | "protocolada";

const LABEL: Record<EstadoPeca, string> = {
  rascunho: "Rascunho",
  revisada: "Revisada",
  assinada: "Assinada",
  aguardando_protocolo: "Aguardando protocolo",
  protocolada: "Protocolada",
};

const TONE: Record<EstadoPeca, string> = {
  rascunho: "bg-amber-50 text-amber-800 border-amber-200",
  revisada: "bg-blue-50 text-blue-800 border-blue-200",
  assinada: "bg-emerald-50 text-emerald-800 border-emerald-200",
  aguardando_protocolo: "bg-amber-50 text-amber-800 border-amber-200",
  protocolada: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const DOT: Record<EstadoPeca, string> = {
  rascunho: "bg-amber-500",
  revisada: "bg-blue-500",
  assinada: "bg-emerald-500",
  aguardando_protocolo: "bg-amber-500",
  protocolada: "bg-emerald-500",
};

/** Deriva o estado do print a partir dos flags/timestamps da API. */
export function deriveEstado(input: {
  status: string;
  saga_state: string;
  sent_to_signing_at?: string | null;
  signed_at?: string | null;
  filed_at?: string | null;
}): EstadoPeca {
  if (input.filed_at) return "protocolada";
  if (input.signed_at) return "aguardando_protocolo";
  if (input.sent_to_signing_at) return "assinada";
  if (input.saga_state === "REVIEWED") return "revisada";
  return "rascunho";
}

export function EstadoBadge({ estado }: { estado: EstadoPeca }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[estado]}`}
    >
      <span className={`size-1.5 rounded-full ${DOT[estado]}`} />
      {LABEL[estado]}
    </span>
  );
}
