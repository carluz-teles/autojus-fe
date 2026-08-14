"use client";

import { Info, ListTodo, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetSection } from "@/components/ui/sheet";
import { useTarefasSugeridas } from "@/features/prazos/hooks/use-tarefas-sugeridas";
import type { PrazoAgendaView, PrazoCounting } from "@/features/prazos/types";
import { cn } from "@/lib/utils";

import { useAnaliseTarefas } from "../hooks/use-analise-tarefas";
import {
  SuggestedTaskCard,
  SuggestedTaskCardSkeleton,
} from "./suggested-task-card";

// Regime de contagem: segmentado com 2 botões (mesmo padrão de confirmar-prazo.tsx —
// replicado por não ser exportado de lá). Aqui é referência visual: sem endpoint de
// recontagem, o vencimento default segue o end_date do prazo (limitação conhecida).
const COUNTINGS: { value: PrazoCounting; label: string }[] = [
  { value: "BUSINESS", label: "Dias úteis" },
  { value: "CALENDAR", label: "Dias corridos" },
];

// Linhas pulsando enquanto a IA analisa — evita o "loading infinito" quando o LLM está off
// (a query tem retry:false, então sempre resolve).
function TextSkeleton({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            "bg-muted h-3 animate-pulse rounded",
            i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Seção "Análise da IA" do detalhe da intimação: compõe 3 SheetSection — "O que
 * aconteceu" (summary, com fallback pro teor bruto quando o LLM está off, pra nunca
 * perder informação), "Recomendação" e "Tarefas sugeridas" (toolbar com toggle de
 * regime + "Aprovar tudo" + lista de SuggestedTaskCard). Busca via useTarefasSugeridas;
 * o estado dos cards e as mutations ficam em useAnaliseTarefas (componente = JSX + binding).
 */
export function AnaliseSection({
  prazo,
  fallbackContent,
}: {
  prazo: PrazoAgendaView;
  fallbackContent?: string | null;
}) {
  const { data, isLoading, isError } = useTarefasSugeridas(prazo.id);
  const [counting, setCounting] = useState<PrazoCounting>(prazo.counting);

  const tarefas = useAnaliseTarefas({
    tasks: data?.suggested_tasks ?? [],
    context: {
      deadlineId: prazo.id,
      intimationId: prazo.intimation_id,
      courtRecordId: prazo.court_record_id,
      defaultDueDate: prazo.end_date,
    },
  });

  const summary = data?.summary?.trim();
  const recommendation = data?.recommendation?.trim();
  const fallback = fallbackContent?.trim();

  return (
    <div className="flex flex-col gap-6">
      <SheetSection title="O que aconteceu">
        {isLoading ? (
          <TextSkeleton lines={3} />
        ) : summary ? (
          <p className="whitespace-pre-line">{summary}</p>
        ) : fallback ? (
          <p className="whitespace-pre-line">{fallback}</p>
        ) : (
          <p className="text-muted-foreground">
            Sem prévia de conteúdo nesta publicação.
          </p>
        )}
      </SheetSection>

      <SheetSection title="Recomendação" accent>
        {isLoading ? (
          <TextSkeleton lines={2} />
        ) : recommendation ? (
          <div className="flex items-start gap-2">
            <Info className="text-gold mt-0.5 size-4 shrink-0" />
            <p className="whitespace-pre-line">{recommendation}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            A IA ainda não gerou uma recomendação para esta intimação.
          </p>
        )}
      </SheetSection>

      <SheetSection title="Tarefas sugeridas">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <SuggestedTaskCardSkeleton />
            <SuggestedTaskCardSkeleton />
          </div>
        ) : tarefas.hasCards ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="bg-muted/50 inline-flex w-fit gap-1 rounded-lg border p-1">
                {COUNTINGS.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant={counting === c.value ? "default" : "ghost"}
                    aria-pressed={counting === c.value}
                    onClick={() => setCounting(c.value)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={tarefas.approveAll}
                disabled={tarefas.pendingCount === 0 || tarefas.busy}
              >
                <Sparkles /> Aprovar tudo
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {tarefas.cards.map((card) => (
                <SuggestedTaskCard
                  key={card.key}
                  card={card}
                  assigneeLabel={tarefas.assigneeLabel}
                  busy={tarefas.busy}
                  onDraftChange={(draft) =>
                    tarefas.updateDraft(card.key, draft)
                  }
                  onToggleEdit={(editing) =>
                    tarefas.setEditing(card.key, editing)
                  }
                  onDismiss={() => tarefas.dismiss(card.key)}
                  onCreate={() => tarefas.createOne(card.key)}
                  onSave={() => tarefas.saveOne(card.key)}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            className="min-h-0 border-0 py-6"
            icon={ListTodo}
            title={
              isError
                ? "Não foi possível carregar a análise"
                : "Sem tarefas sugeridas"
            }
            description={
              isError
                ? "Tente reabrir a intimação em instantes."
                : "A IA não sugeriu ações para esta intimação — monte as tarefas manualmente no painel de prazo."
            }
          />
        )}
      </SheetSection>
    </div>
  );
}
