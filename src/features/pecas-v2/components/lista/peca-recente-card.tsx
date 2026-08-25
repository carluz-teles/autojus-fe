// Card horizontal da lista "Peças recentes" — badge de estado no topo,
// thumbnail A4 estilizado, título + subtítulo + nº processo, avatar + nome
// + data. Clique navega pro fluxo da peça (partida/construção/etc).

import Link from "next/link";

import { EstadoBadge, type EstadoPeca } from "./estado-badge";
import { PecaThumbnail } from "./peca-thumbnail";

interface Props {
  id: string;
  titulo: string;
  /** Subtítulo (draft.title). Quando vazio, a linha some — o BE agora preenche
   *  default no create, então a maioria dos cards terá algo aqui. */
  subtitulo?: string;
  cnj: string;
  estado: EstadoPeca;
  /** Nome do autor. Vazio → mostra "—" e avatar traço. */
  autorNome?: string;
  dataLabel: string;
}

export function PecaRecenteCard({
  id,
  titulo,
  subtitulo,
  cnj,
  estado,
  autorNome,
  dataLabel,
}: Props) {
  const iniciais = autorNome ? iniciaisDe(autorNome) : "—";
  const nomeExibido = autorNome || "—";
  return (
    <Link
      href={`/pecas/${id}`}
      className="border-border bg-card hover:border-primary/40 hover:bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 no-underline transition-colors"
    >
      {/* Badge no topo */}
      <div>
        <EstadoBadge estado={estado} />
      </div>

      {/* Thumbnail A4 */}
      <div className="w-full">
        <PecaThumbnail />
      </div>

      {/* Título + subtítulo + CNJ */}
      <div className="min-w-0">
        <div className="text-foreground truncate text-[13.5px] font-medium">
          {titulo}
        </div>
        {subtitulo && (
          <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[11.5px] leading-[1.35]">
            {subtitulo}
          </div>
        )}
        {cnj && (
          <div className="text-muted-foreground mt-1 font-mono text-[10.5px] tabular-nums">
            {cnj}
          </div>
        )}
      </div>

      {/* Avatar + nome + data (rodapé) */}
      <div className="border-border/60 mt-auto flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-1.5">
          <span className="bg-muted text-muted-foreground grid size-5 place-items-center rounded-full text-[9.5px] font-medium tracking-wide">
            {iniciais}
          </span>
          <span className="text-muted-foreground text-[11.5px]">
            {nomeExibido}
          </span>
        </div>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {dataLabel}
        </span>
      </div>
    </Link>
  );
}

function iniciaisDe(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
