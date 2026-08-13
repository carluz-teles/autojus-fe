"use client";

import { ExternalLink, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetField, SheetSection } from "@/components/ui/sheet";
import type {
  IntimacaoDegree,
  IntimacaoStatus,
  IntimacaoType,
  IntimacaoView,
} from "@/features/intimacoes/types";
import { ConfirmarPrazo } from "@/features/prazos/components/confirmar-prazo";

// Peças de apresentação do detalhe da intimação, compartilhadas pelo drawer
// (IntimacaoDetail, sobre a lista) e pela página de deep-link (/intimacoes/[id]).
// Fonte única do corpo + F2 (ConfirmarPrazo) para os dois entrarem por caminhos
// diferentes sem duplicar conteúdo.

export const DEGREE_LABEL: Record<IntimacaoDegree, string> = {
  UNKNOWN: "Grau não informado",
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado Especial",
  SUPERIOR: "Instância superior",
};

export const TYPE_LABEL: Record<IntimacaoType, string> = {
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  COMUNICACAO: "Comunicação",
};

export const STATUS_LABEL: Record<IntimacaoStatus, string> = {
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

/** Badges de tipo + situação — eyebrow do drawer e cabeçalho da página. */
export function IntimacaoBadges({ intimacao }: { intimacao: IntimacaoView }) {
  return (
    <>
      <Badge variant="secondary">
        {TYPE_LABEL[intimacao.type] ?? intimacao.type}
      </Badge>
      <Badge variant={intimacao.status === "CANCELLED" ? "outline" : "default"}>
        {STATUS_LABEL[intimacao.status] ?? intimacao.status}
      </Badge>
    </>
  );
}

/** Ação "Abrir no tribunal" — desabilitada quando não há source_url. */
export function AbrirNoTribunalButton({
  intimacao,
}: {
  intimacao: IntimacaoView;
}) {
  return (
    <Button
      size="sm"
      disabled={!intimacao.source_url}
      render={
        intimacao.source_url ? (
          <a href={intimacao.source_url} target="_blank" rel="noreferrer" />
        ) : undefined
      }
    >
      <ExternalLink /> Abrir no tribunal
    </Button>
  );
}

// Corpo do detalhe: conteúdo da publicação + metadados da captura DJEN + painel
// F2 (ConfirmarPrazo) + placeholder da análise da IA. Sem chrome (título/footer)
// para servir tanto o SheetContent do drawer quanto a página de deep-link.
export function IntimacaoDetailBody({
  intimacao,
}: {
  intimacao: IntimacaoView;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SheetSection title="O que aconteceu">
        {intimacao.content_preview ? (
          <p className="whitespace-pre-line">{intimacao.content_preview}</p>
        ) : (
          <p className="text-muted-foreground">
            Sem prévia de conteúdo nesta publicação.
          </p>
        )}
      </SheetSection>

      <dl className="rounded-xl border p-4">
        <SheetField label="Disponibilização">
          {fmtDate(intimacao.made_available_at)}
        </SheetField>
        <SheetField label="Publicação">
          {fmtDate(intimacao.published_at)}
        </SheetField>
        <SheetField label="Início do prazo" emphasis>
          {fmtDate(intimacao.deadline_start_at)}
        </SheetField>
        <SheetField label="Tribunal / grau">
          {intimacao.court} ·{" "}
          {DEGREE_LABEL[intimacao.degree] ?? intimacao.degree}
        </SheetField>
        <SheetField label="Fonte">{intimacao.source || "—"}</SheetField>
      </dl>

      <SheetSection title="Prazo & Tarefas">
        <ConfirmarPrazo intimationId={intimacao.id} />
      </SheetSection>

      {/* Placeholder da fase de IA — reserva o espaço da "tela-alma". */}
      <div className="border-gold/25 from-gold/[0.06] rounded-xl border border-dashed bg-gradient-to-br to-transparent p-5">
        <div className="flex items-center gap-2">
          <span className="bg-gold/15 text-gold flex size-8 items-center justify-center rounded-full">
            <Sparkles className="size-4" />
          </span>
          <p className="text-sm font-medium">Análise da IA · em breve</p>
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          A IA vai ler esta intimação, resumir o que aconteceu e o que fazer, e
          sugerir ações com prazo (via calendário forense) prontas para virar
          tarefas.
        </p>
      </div>
    </div>
  );
}
