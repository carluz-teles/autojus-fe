"use client";

import { CircleCheck, Clock, FileText, PenLine } from "lucide-react";
import { useState } from "react";

import { Kpi } from "@/components/mock-ui/data-display";
import { CelulaDupla, DataTable } from "@/components/mock-ui/data-table";
import { PageHeader } from "@/components/mock-ui/layout";
import { StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import { usePecas } from "@/features/pecas/hooks/use-peca";
import {
  type EstadoFiltro,
  FilterBar,
  FILTRO_VAZIO,
  passaFiltro,
} from "@/features/shared/filtros";
import type { Urgencia } from "@/features/shared/prazo";
import { formatarData } from "@/lib/utils";

const TOM_PECA: Record<string, Tom> = {
  DRAFT: "neutral",
  SIGNED: "success",
  FILED: "success",
  DISCARDED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SIGNED: "Assinada",
  FILED: "Protocolada",
  DISCARDED: "Descartada",
};

// Closed set alinhado ao BE (DEFENSE|COMPLAINT|APPEAL|MOTION|OTHER).
// Legados mantidos como fallback pra rows antigas.
const PIECE_TYPE_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  COMPLAINT: "Petição inicial",
  APPEAL: "Recurso",
  MOTION: "Petição",
  OTHER: "Peça",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

export function PecasView() {
  const {
    items: pecas,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePecas();
  const [filtro, setFiltro] = useState<EstadoFiltro>(FILTRO_VAZIO);

  const linhas = pecas.map((p) => ({
    peca: p,
    urgencia: "sem" as Urgencia,
    texto: [p.piece_type, p.title, p.status].join(" · "),
  }));

  const visiveis = linhas.filter((l) =>
    passaFiltro({ urgencia: l.urgencia, texto: l.texto }, filtro),
  );

  const conta = (s: string) => pecas.filter((p) => p.status === s).length;

  if (isPending) return <div className="p-8">Carregando…</div>;

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Peças"
        descricao="Minutas em construção, assinadas e protocoladas — cada peça nasce de uma intimação."
      >
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Kpi
            rotulo="Rascunhos"
            valor={conta("DRAFT")}
            icone={<FileText className="size-4" />}
          />
          <Kpi
            rotulo="Assinadas"
            valor={conta("SIGNED")}
            tom="info"
            icone={<PenLine className="size-4" />}
          />
          <Kpi
            rotulo="Protocoladas"
            valor={conta("FILED")}
            tom="warning"
            icone={<Clock className="size-4" />}
          />
          <Kpi
            rotulo="Descartadas"
            valor={conta("DISCARDED")}
            tom="success"
            icone={<CircleCheck className="size-4" />}
          />
        </div>

        <FilterBar
          tela="pecas"
          filtro={filtro}
          onChange={setFiltro}
          placeholder="Buscar por tipo ou título da peça…"
        />
      </PageHeader>

      <DataTable
        larguraMinima="990px"
        colunas={[
          { label: "Peça", largura: "330px" },
          { label: "Status", largura: "146px" },
          { label: "Cobertura", largura: "146px" },
          { label: "Protocolo", largura: "146px" },
          { label: "Criada em", largura: "146px" },
        ]}
        rodape={`Mostrando ${visiveis.length} de ${pecas.length}`}
        onLimpar={() => setFiltro(FILTRO_VAZIO)}
        linhas={visiveis.map((l) => ({
          id: l.peca.id,
          href: `/pecas/${l.peca.id}`,
          celulas: [
            <CelulaDupla
              key="p"
              principal={`${PIECE_TYPE_LABEL[l.peca.piece_type] ?? l.peca.piece_type} — ${l.peca.title}`}
              apoio={
                l.peca.saga_state !== "CREATED" ? l.peca.saga_state : undefined
              }
            />,
            <StatusBadge
              key="s"
              tone={TOM_PECA[l.peca.status] ?? "neutral"}
              ponto
            >
              {STATUS_LABEL[l.peca.status] ?? l.peca.status}
            </StatusBadge>,
            <span key="cov" className="text-muted-foreground text-[12px]">
              {l.peca.coverage_summary?.grounded ? (
                <span className="rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--success-foreground)]">
                  Fundamentada
                </span>
              ) : (
                "—"
              )}
            </span>,
            <span
              key="filed"
              className="text-muted-foreground text-[12px] tabular-nums"
            >
              {l.peca.filed_at ? formatarData(l.peca.filed_at) : "—"}
            </span>,
            <span
              key="created"
              className="text-muted-foreground text-[12px] tabular-nums"
            >
              {formatarData(l.peca.created_at)}
            </span>,
          ],
        }))}
      />

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-primary text-[13px] font-medium hover:opacity-80 disabled:opacity-50"
          >
            {isFetchingNextPage ? "Carregando…" : "Mostrar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
