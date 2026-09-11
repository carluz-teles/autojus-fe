"use client";

import {
  ArrowUpRight,
  Check,
  ClipboardList,
  FilePenLine,
  FileSearch,
  FileText,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  type FlowEvidence,
  type FlowStepId,
  providenciaFlow,
} from "../lib/providencia-flow";
import type { ActionItemView } from "../types";

const icons = {
  origin: Mail,
  work: ClipboardList,
  writing: FilePenLine,
  review: FileSearch,
  filing: Send,
  done: Check,
};
const stepStates = {
  recorded: "Registrado",
  current: "Você está aqui",
  pending: "A seguir",
  unrecorded: "Sem registro",
};

export function ProvidenciaSteps({
  item,
  evidence,
}: {
  item: ActionItemView;
  evidence: FlowEvidence;
}) {
  const flow = providenciaFlow(item, evidence);
  const [inspected, setInspected] = useState<FlowStepId | null>(null);
  const detailId = useId();
  const selected = flow.steps.find((step) => step.id === inspected);
  return (
    <section
      aria-label="Etapas da providência"
      className="min-w-0 border-y py-4"
    >
      <ol className="grid grid-cols-2 gap-4 sm:flex sm:gap-2">
        {flow.steps.map((step, index) => {
          const Icon = step.state === "recorded" ? Check : icons[step.id];
          return (
            <li key={step.id} className="relative min-w-0 flex-1">
              {index < flow.steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-4 right-0 left-9 hidden h-px sm:block",
                    step.state === "recorded" ? "bg-primary/30" : "bg-border",
                  )}
                />
              ) : null}
              <button
                type="button"
                aria-label={`${step.label} — ${stepStates[step.state]}`}
                aria-current={step.state === "current" ? "step" : undefined}
                aria-expanded={selected?.id === step.id}
                aria-controls={detailId}
                onClick={() =>
                  setInspected(inspected === step.id ? null : step.id)
                }
                className="focus-visible:ring-ring relative flex w-full flex-col items-start gap-2 rounded-lg p-1 text-left outline-none focus-visible:ring-2"
              >
                <span
                  className={cn(
                    "relative grid size-7 place-items-center rounded-full border motion-safe:transition-colors",
                    step.state === "recorded"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : step.state === "current"
                        ? "border-primary bg-primary text-primary-foreground ring-primary/10 ring-4"
                        : "bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-xs",
                    step.state === "current"
                      ? "text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {stepStates[step.state]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div
        id={detailId}
        hidden={!selected}
        className="text-muted-foreground mt-4 border-t pt-3 text-xs leading-relaxed"
        role="status"
      >
        {selected ? (
          <>
            <span className="text-foreground font-medium">
              {selected.label}:{" "}
            </span>
            {selected.detail}{" "}
            <span>Consulta de etapa; nenhuma ação é executada aqui.</span>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function ProvidenciaNextStep({
  item,
  evidence,
  refreshing,
  onRefresh,
  children,
}: {
  item: ActionItemView;
  evidence: FlowEvidence;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const flow = providenciaFlow(item, evidence);
  return (
    <section
      className="surface-panel flex flex-col gap-4 p-5 sm:p-6"
      aria-label="Próximo passo da providência"
    >
      <div>
        <p className="section-label">
          {flow.done || flow.cancelled
            ? "Situação do trabalho"
            : "Próximo passo"}
        </p>
        <h2 className="font-display mt-1 text-xl font-medium">{flow.title}</h2>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {flow.description}
      </p>
      {evidence.loading ? (
        <p role="status" className="text-muted-foreground text-xs">
          Consultando a situação da peça e do protocolo…
        </p>
      ) : null}
      {evidence.unavailable ? (
        <Alert>
          <AlertTitle>Acompanhamento parcialmente indisponível</AlertTitle>
          <AlertDescription>
            Não foi possível atualizar todos os dados da peça ou do protocolo.
            Confira a situação antes de qualquer novo envio.
          </AlertDescription>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={refreshing}
            onClick={onRefresh}
          >
            Atualizar situação
          </Button>
        </Alert>
      ) : null}
      {item.judicial_review_status === "a_confirmar" ? (
        <p className="text-muted-foreground text-xs">
          O prazo judicial ainda precisa de revisão na intimação de origem.
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function ProvidenciaPiece({
  item,
  evidence,
  creatorName,
}: {
  item: ActionItemView;
  evidence: FlowEvidence;
  creatorName?: string | null;
}) {
  if (!item.draft_id) return null;
  const draft =
    evidence.draft?.id === item.draft_id ? evidence.draft : undefined;
  const state = draft?.saga_state ?? item.draft_state;
  const label =
    (
      {
        CREATED: "Em preparação",
        EXTRACTING: "Em geração",
        DRAFTED: "Minuta disponível",
        REVIEWED: "Revisão automática realizada",
        FAILED: "Geração precisa de atenção",
      } as Record<string, string>
    )[state ?? ""] ?? "Peça vinculada";
  return (
    <section
      className="surface-panel flex flex-col gap-4 p-5 sm:p-6"
      aria-label="Peça vinculada"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <FileText className="text-primary size-4" aria-hidden />
          Peça vinculada
        </h2>
        <Badge variant={state === "FAILED" ? "warning" : "secondary"}>
          {label}
        </Badge>
      </div>
      <Link
        href={`/pecas/${item.draft_id}?retorno=${encodeURIComponent(`/providencias/${item.id}`)}`}
        className="font-display text-primary focus-visible:ring-ring inline-flex items-center justify-between gap-3 rounded text-lg underline-offset-4 outline-none hover:underline focus-visible:ring-2"
      >
        {draft?.title || item.draft_title || item.title}
        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      </Link>
      {draft ? (
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-muted-foreground">Criada por</dt>
            <dd className="mt-1 break-words">
              {draft.created_by === undefined
                ? "Autoria indisponível"
                : draft.created_by
                  ? creatorName || "Membro com identificação indisponível"
                  : "Autoria não registrada"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Criada em</dt>
            <dd className="mt-1">{formatDate(draft.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Última atualização</dt>
            <dd className="mt-1">{formatDate(draft.updated_at)}</dd>
          </div>
        </dl>
      ) : null}
      <p className="text-muted-foreground text-xs">
        A peça abre com acesso ao texto, às fontes e ao histórico de versões. A
        revisão automática não substitui a conferência do advogado.
      </p>
    </section>
  );
}
