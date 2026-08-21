"use client";

import { CircleCheck, Clock,FileText, PenLine } from "lucide-react";
import { useState } from "react";

import { Kpi } from "@/components/mock-ui/data-display";
import { CelulaDupla, DataTable } from "@/components/mock-ui/data-table";
import { PageHeader } from "@/components/mock-ui/layout";
import { StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import {
  type EstadoFiltro,
  FilterBar,
  FILTRO_VAZIO,
  passaFiltro,
} from "@/features/shared/filtros";
import { useIntimacoes, usePecas } from "@/features/shared/hooks";
import {
  corDaUrgencia,
  diasRestantes,
  urgenciaDe,
} from "@/features/shared/prazo";
import type { PecaStatus } from "@/features/shared/types";
import { formatarData } from "@/lib/utils";

export const TOM_PECA: Record<PecaStatus, Tom> = {
  Rascunho: "neutral",
  Revisada: "info",
  Assinada: "success",
  "Aguardando protocolo": "warning",
  Protocolada: "success",
  Descartada: "neutral",
};

export function PecasView() {
  const { data: pecas, isLoading } = usePecas();
  const { data: intimacoes } = useIntimacoes();
  const [filtro, setFiltro] = useState<EstadoFiltro>(FILTRO_VAZIO);

  const linhas = (pecas ?? []).map((p) => {
    const intimacao = (intimacoes ?? []).find((i) => i.id === p.intimacaoId);
    const termo = intimacao?.prazo?.termoFinal ?? null;
    const dias = termo ? diasRestantes(termo) : null;
    return {
      peca: p,
      processo: intimacao?.processo ?? "—",
      prazo: termo ? formatarData(termo) : "—",
      urgencia: urgenciaDe(dias),
      texto: [p.tipo, p.status, p.responsavel, intimacao?.processo].join(" · "),
    };
  });

  const visiveis = linhas.filter((l) =>
    passaFiltro({ urgencia: l.urgencia, texto: l.texto }, filtro),
  );

  const conta = (s: PecaStatus) =>
    linhas.filter((l) => l.peca.status === s).length;

  if (isLoading) return <div className="p-8">Carregando…</div>;

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Peças"
        descricao="Minutas em construção, assinadas e protocoladas — cada peça nasce de uma intimação."
      >
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Kpi
            rotulo="Rascunhos"
            valor={conta("Rascunho")}
            icone={<FileText className="size-4" />}
          />
          <Kpi
            rotulo="Em revisão"
            valor={conta("Revisada")}
            tom="info"
            icone={<PenLine className="size-4" />}
          />
          <Kpi
            rotulo="Aguardando protocolo"
            valor={conta("Aguardando protocolo")}
            tom="warning"
            icone={<Clock className="size-4" />}
          />
          <Kpi
            rotulo="Protocoladas"
            valor={conta("Protocolada")}
            tom="success"
            icone={<CircleCheck className="size-4" />}
          />
        </div>

        <FilterBar
          tela="pecas"
          filtro={filtro}
          onChange={setFiltro}
          placeholder="Buscar por processo ou tipo de peça…"
        />
      </PageHeader>

      <DataTable
        larguraMinima="990px"
        colunas={[
          { label: "Peça", largura: "330px" },
          { label: "Processo", largura: "196px" },
          { label: "Prazo", largura: "112px" },
          { label: "Responsável", largura: "146px" },
          { label: "Status", largura: "176px" },
        ]}
        rodape={`Mostrando ${visiveis.length} de ${linhas.length}`}
        onLimpar={() => setFiltro(FILTRO_VAZIO)}
        linhas={visiveis.map((l) => ({
          id: l.peca.id,
          href: `/pecas/${l.peca.id}`,
          tom: corDaUrgencia(l.urgencia),
          celulas: [
            <CelulaDupla
              key="p"
              principal={`${l.peca.tipo} ${l.peca.versao}`}
              apoio={l.peca.protocolo ? `Protocolo ${l.peca.protocolo}` : undefined}
            />,
            <span key="pr" className="block truncate tabular-nums text-muted-foreground">
              {l.processo}
            </span>,
            <span
              key="d"
              className="tabular-nums"
              style={{ color: corDaUrgencia(l.urgencia) }}
            >
              {l.prazo}
            </span>,
            <span key="r" className="block truncate text-muted-foreground">
              {l.peca.responsavel}
            </span>,
            <StatusBadge key="s" tone={TOM_PECA[l.peca.status]} ponto>
              {l.peca.status}
            </StatusBadge>,
          ],
        }))}
      />
    </div>
  );
}
