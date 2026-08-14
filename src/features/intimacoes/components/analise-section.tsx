"use client";

import { Info, ListTodo, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetSection } from "@/components/ui/sheet";
import type { PrazoAgendaView, PrazoCounting } from "@/features/prazos/types";
import { cn } from "@/lib/utils";

import { useAnalise } from "../hooks/use-analise";
import {
  SuggestedTaskCard,
  SuggestedTaskCardSkeleton,
} from "./suggested-task-card";

// Regime de contagem exibido como rótulo informativo. SEM toggle: sem endpoint de
// recontagem, alternar BUSINESS/CALENDAR não teria efeito (o vencimento default das
// tarefas segue o end_date do prazo, já calculado). Um botão que não muda nada seria
// uma falsa promessa ao advogado — o regime vai no payload do F2 como veio do prazo.
function countingLabel(counting: PrazoCounting): string {
  return counting === "BUSINESS" ? "Dias úteis" : "Dias corridos";
}

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
 * perder informação), "Recomendação" e "Tarefas sugeridas" (toolbar com regime + "Aprovar
 * tudo" + lista de SuggestedTaskCard). Toda a lógica vem do hook público useAnalise
 * (componente = JSX + binding). "Aprovar tudo" em lote: falha parcial vira Alert.
 */
export function AnaliseSection({
  prazo,
  fallbackContent,
}: {
  prazo: PrazoAgendaView;
  fallbackContent?: string | null;
}) {
  const analise = useAnalise(prazo);

  const summary = analise.summary;
  const recommendation = analise.recommendation;
  const fallback = fallbackContent?.trim();

  return (
    <div className="flex flex-col gap-6">
      <SheetSection title="O que aconteceu">
        {analise.isLoading ? (
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
        {analise.isLoading ? (
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
        {analise.isLoading ? (
          <div className="flex flex-col gap-3">
            <SuggestedTaskCardSkeleton />
            <SuggestedTaskCardSkeleton />
          </div>
        ) : analise.hasCards ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                Regime: {countingLabel(prazo.counting)}
              </span>
              <Button
                size="sm"
                onClick={analise.approveAll}
                disabled={analise.pendingCount === 0 || analise.busy}
              >
                <Sparkles /> Aprovar tudo
              </Button>
            </div>

            {analise.batchError ? (
              <p className="text-destructive text-sm" role="alert">
                {analise.batchError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              {analise.cards.map((card) => (
                <SuggestedTaskCard
                  key={card.key}
                  card={card}
                  assigneeLabel={analise.assigneeLabel}
                  busy={analise.busy}
                  onDraftChange={(draft) =>
                    analise.updateDraft(card.key, draft)
                  }
                  onToggleEdit={(editing) =>
                    analise.setEditing(card.key, editing)
                  }
                  onDismiss={() => analise.dismiss(card.key)}
                  onCreate={() => analise.createOne(card.key)}
                  onSave={() => analise.saveOne(card.key)}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            className="min-h-0 border-0 py-6"
            icon={ListTodo}
            title={
              analise.isError
                ? "Não foi possível carregar a análise"
                : "Sem tarefas sugeridas"
            }
            description={
              analise.isError
                ? "Tente reabrir a intimação em instantes."
                : "A IA não sugeriu ações para esta intimação — monte as tarefas manualmente no painel de prazo."
            }
          />
        )}
      </SheetSection>
    </div>
  );
}
