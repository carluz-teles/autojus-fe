"use client";

import {
  Archive,
  CheckCircle2,
  FileStack,
  FileText,
  PenLine,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { pecaTone, StatusBadge } from "@/components/ui/status-badge";
import { ORIGEM_LABEL, STATUS_LABEL } from "@/features/pecas/lib/labels";
import type { PecaView } from "@/features/pecas/types";
import { formatDate } from "@/lib/format";

// TELA 1 — Peças (lista global, /pecas). CASCA fiel ao design LEXIA. O backend de
// Peças é FASE 4 e ainda NÃO existe: os KPIs mostram "—" (com selo de fase), a
// FilterToolbar é inerte (placeholder), o botão "Gerar peça com IA" é desabilitado
// e o corpo da tabela é um EmptyState proeminente. As linhas abaixo são PRÉVIA,
// marcadas explicitamente — nunca disfarçadas de dado real.

// Colunas do design (PEÇA · TIPO · PROCESSO · ORIGEM · RESPONSÁVEL · STATUS ·
// VERSÃO · ÚLTIMA ATUALIZAÇÃO · AÇÃO). Só JSX + binding; a AÇÃO fica no kebab da
// DataTable. Renderizadas apenas quando o usuário abre a prévia (ver abaixo).
const COLUMNS: DataTableColumn<PecaView>[] = [
  {
    key: "peca",
    header: "Peça",
    cell: (p) => (
      <div className="flex flex-col">
        <span className="font-medium">{p.title}</span>
        <span className="bg-muted/60 text-muted-foreground mt-0.5 inline-flex w-fit rounded-md px-2 py-0.5 font-mono text-xs tracking-wide">
          {p.code}
        </span>
      </div>
    ),
  },
  {
    key: "tipo",
    header: "Tipo",
    cell: (p) => <span className="text-muted-foreground">{p.type}</span>,
  },
  {
    key: "processo",
    header: "Processo",
    cell: (p) => <span className="tabular-nums">{p.cnj_number}</span>,
  },
  {
    key: "origem",
    header: "Origem",
    cell: (p) => (
      <span className="text-muted-foreground">{ORIGEM_LABEL[p.origem]}</span>
    ),
  },
  {
    key: "responsavel",
    header: "Responsável",
    cell: (p) => (
      <span className="text-muted-foreground">{p.responsavel ?? "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => (
      <StatusBadge
        label={STATUS_LABEL[p.status]}
        tone={pecaTone(STATUS_LABEL[p.status])}
      />
    ),
  },
  {
    key: "versao",
    header: "Versão",
    align: "right",
    cell: (p) => <span className="tabular-nums">v{p.version}</span>,
  },
  {
    key: "atualizacao",
    header: "Última atualização",
    cell: (p) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(p.updated_at)}
      </span>
    ),
  },
];

// Linhas de PRÉVIA (nunca "dado real"): só aparecem se o usuário optar por ver a
// prévia da tabela. Ilustram o layout das colunas; ficam por trás de um selo.
const PREVIEW_ROWS: PecaView[] = [
  {
    id: "preview-1",
    code: "PEC-0001",
    title: "Manifestação — Cumprimento de sentença",
    type: "Manifestação",
    cnj_number: "0005746-66.2025.8.26.0196",
    origem: "IA",
    responsavel: "Dra. Helena Nunes",
    status: "REVIEWED",
    version: 3,
    updated_at: "2026-02-10T12:00:00Z",
  },
  {
    id: "preview-2",
    code: "PEC-0002",
    title: "Contestação — Ação de cobrança",
    type: "Contestação",
    cnj_number: "1002233-45.2025.8.26.0100",
    origem: "INTIMACAO",
    responsavel: "Dr. Marcos Prado",
    status: "DRAFT",
    version: 1,
    updated_at: "2026-02-08T09:30:00Z",
  },
];

export function PecasListPage() {
  // UI local efêmera (não é server state): alterna a exibição das linhas de
  // prévia sob a tabela. Sem prévia, o corpo é um EmptyState de Fase 4.
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <PageHeader
        title="Peças"
        description="Produção de minutas com IA a partir dos autos — revisão com citações antes de protocolar."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Prévia · Fase 4</Badge>
            {/* Placeholder: a geração com IA chega na Fase 4. */}
            <Button size="sm" disabled title="Chega na Fase 4">
              <Sparkles /> Gerar peça com IA
            </Button>
          </div>
        }
      />

      <section className="reveal mt-8">
        <KpiRow cols={5}>
          <KpiCard
            icon={FileStack}
            label="Total"
            value="—"
            sublabel="Fase 4"
            tone="neutral"
          />
          <KpiCard
            icon={PenLine}
            label="Em produção"
            value="—"
            sublabel="Fase 4"
            tone="info"
          />
          <KpiCard
            icon={ScanSearch}
            label="Em revisão"
            value="—"
            sublabel="Fase 4"
            tone="warning"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Protocoladas"
            value="—"
            sublabel="Fase 4"
            tone="success"
          />
          <KpiCard
            icon={Archive}
            label="Arquivadas"
            value="—"
            sublabel="Fase 4"
            tone="neutral"
          />
        </KpiRow>
      </section>

      {/* FilterToolbar visível, porém INERTE (placeholder): busca desligada. */}
      <div className="reveal mt-6" aria-hidden>
        <div className="pointer-events-none opacity-60">
          <FilterToolbar
            search=""
            onSearchChange={() => {}}
            placeholder="Buscar peça… (chega na Fase 4)"
            onFilters={() => {}}
          />
        </div>
      </div>

      <div className="reveal mt-4">
        <DataTable
          columns={COLUMNS}
          rows={showPreview ? PREVIEW_ROWS : []}
          rowKey={(p) => p.id}
          statusTone={(p) => pecaTone(STATUS_LABEL[p.status])}
          empty={
            <EmptyState
              icon={Sparkles}
              title="A produção de peças com IA chega na Fase 4"
              description="Aqui você vai ver as minutas geradas dos autos, revisá-las com citações e acompanhar cada versão até o protocolo. Esta é a casca do design — sem dado real."
              phase="Chega na Fase 4"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  Ver prévia do layout
                </Button>
              }
              className="border-0"
            />
          }
        />
      </div>

      {showPreview ? (
        <div className="reveal mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <FileText className="size-3.5" />
            Linhas de exemplo (prévia do layout) — não são peças reais.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(false)}
          >
            Ocultar prévia
          </Button>
        </div>
      ) : null}
    </>
  );
}
