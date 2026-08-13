"use client";

import { FileText, History, ListChecks, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DetailBody,
  DetailHeader,
  DetailLayout,
} from "@/components/ui/detail-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { SheetField, SheetSection } from "@/components/ui/sheet";
import { prazoTone, StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";

import { daysLeftLabel, kindLabel, prazoStatusLabel } from "../lib/labels";
import type { PrazoDetalheView } from "../types";

// TELA 2 — Detalhe do Prazo (/prazos/[id]) no design LEXIA. Monta o DetailLayout da
// Wave 0: breadcrumb + título "Prazo <tipo>" + StatusBadge(derivado de status +
// days_left) + ações; aba Detalhes real (o "por quê" do cálculo) e abas Histórico/
// Tarefas/Peças placeholders. Componente = binding: o prazo vem do hook.

// Regime de contagem em pt-BR — nada de cálculo no JSX.
const COUNTING_LABEL: Record<string, string> = {
  BUSINESS: "Dias úteis",
  CALENDAR: "Dias corridos",
};

export function PrazoDetalhe({ prazo }: { prazo: PrazoDetalheView }) {
  const statusLabel = prazoStatusLabel(prazo.status, prazo.days_left);

  return (
    <DetailLayout
      header={
        <DetailHeader
          breadcrumb={[
            { label: "Prazos", href: "/prazos" },
            { label: kindLabel(prazo.kind) },
          ]}
          title={`Prazo ${kindLabel(prazo.kind)}`}
          status={
            <StatusBadge label={statusLabel} tone={prazoTone(statusLabel)} />
          }
          subtitle={
            prazo.cnj_number
              ? `${prazo.cnj_number}${prazo.court ? ` · ${prazo.court}` : ""}`
              : undefined
          }
          actions={
            <>
              <Button size="sm" variant="outline" disabled>
                <Pencil /> Editar prazo
              </Button>
              <RowActions label="Mais ações" />
            </>
          }
        />
      }
    >
      <Tabs defaultValue="detalhes">
        <TabsList aria-label="Abas do prazo">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="pecas">Peças</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4">
          <DetailBody
            aside={
              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Prazo legal">{prazo.days} dias</SheetField>
                <SheetField label="Contagem">
                  {COUNTING_LABEL[prazo.counting] ?? prazo.counting}
                </SheetField>
                <SheetField label="Dobrado">
                  {prazo.doubled ? "Sim" : "Não"}
                </SheetField>
                <SheetField label="Dias restantes" emphasis>
                  {daysLeftLabel(prazo.days_left)}
                </SheetField>
                <SheetField label="Origem">{prazo.source || "—"}</SheetField>
              </dl>
            }
          >
            <div className="flex flex-col gap-6">
              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Início">
                  {formatDate(prazo.start_date)}
                </SheetField>
                <SheetField label="Fim" emphasis>
                  {formatDate(prazo.end_date)}
                </SheetField>
                <SheetField label="Status">{statusLabel}</SheetField>
                <SheetField label="Intimação de origem">
                  {prazo.intimation_id ? (
                    <Link
                      href={`/intimacoes/${prazo.intimation_id}`}
                      className="text-gold hover:underline"
                    >
                      Abrir intimação
                    </Link>
                  ) : (
                    "—"
                  )}
                </SheetField>
              </dl>

              {prazo.doubled && prazo.doubled_reason ? (
                <SheetSection title="Motivo da dobra" accent>
                  {prazo.doubled_reason}
                </SheetSection>
              ) : null}

              <SheetSection title="Feriados / suspensões aplicados">
                {prazo.holidays_applied.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {prazo.holidays_applied.map((h) => (
                      <li key={h} className="tabular-nums">
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum feriado ou suspensão incidiu na contagem.
                  </p>
                )}
              </SheetSection>
            </div>
          </DetailBody>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <EmptyState
            icon={History}
            title="Sem histórico ainda"
            description="As mudanças deste prazo aparecem aqui."
            phase="Chega numa próxima fatia"
          />
        </TabsContent>

        <TabsContent value="tarefas" className="mt-4">
          <EmptyState
            icon={ListChecks}
            title="Nenhuma tarefa vinculada"
            description="As tarefas derivadas deste prazo aparecem aqui."
            phase="Chega numa próxima fatia"
          />
        </TabsContent>

        <TabsContent value="pecas" className="mt-4">
          <EmptyState
            icon={FileText}
            title="Nenhuma peça vinculada"
            description="A geração de peças com IA chega numa fatia futura."
            phase="Chega na Fase 4"
          />
        </TabsContent>
      </Tabs>
    </DetailLayout>
  );
}
