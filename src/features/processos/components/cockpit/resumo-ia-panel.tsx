"use client";

import {
  CalendarClock,
  CheckCircle2,
  ListChecks,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";

import { useProcessoResumo } from "../../hooks/use-processo-resumo";
import type { ResumoKeyDate } from "../../types";

// Painel "Resumo do processo por IA" (§LEXIA) — consome GET
// /v1/processos/:id/resume (write-once sync-on-first-GET no BE): mostra o
// panorama em linguagem natural + "o que está acontecendo agora", os prazos
// com urgência, riscos e próximas ações sugeridas. Em modo degradado (sem LLM
// no BE) summary="" e risks/ações [] — o painel mostra o que o BE derivou
// deterministicamente (current_status + prazos) sem quebrar. Estado de
// carregamento = skeleton; erro = mensagem com retry (o resumo é best-effort,
// não bloqueia a aba).

const URGENCIA_META: Record<
  ResumoKeyDate["urgency"],
  { className: string; rotulo: string }
> = {
  OVERDUE: {
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    rotulo: "Vencido",
  },
  DUE_SOON: {
    className: "border-gold/40 bg-gold/[0.08] text-gold border",
    rotulo: "Próximo",
  },
  OK: {
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    rotulo: "No prazo",
  },
};

function countdown(daysLeft: number): string {
  if (daysLeft === 0) return "Vence hoje";
  const abs = Math.abs(daysLeft);
  const dias = abs === 1 ? "dia" : "dias";
  return daysLeft < 0 ? `${abs} ${dias} em atraso` : `${abs} ${dias} restantes`;
}

/**
 * Painel do resumo por IA do processo. `processoId` liga o hook; o estado de
 * loading/erro é tratado aqui (a aba segue renderizando o resto do cockpit).
 */
export function ResumoIAPanel({ processoId }: { processoId: string }) {
  const query = useProcessoResumo(processoId);

  if (query.isPending) {
    return <ResumoSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
        <PanelHeader />
        <div
          role="alert"
          className="border-gold/30 bg-gold/[0.05] flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center"
        >
          <div className="flex flex-col gap-1">
            <p className="text-foreground/80 text-sm font-medium">
              Resumo indisponível
            </p>
            <p className="text-muted-foreground text-sm">
              Não foi possível gerar o resumo agora.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
          >
            <RotateCcw className="size-3.5" /> Tentar novamente
          </Button>
        </div>
      </section>
    );
  }

  const resumo = query.data;

  return (
    <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
      <PanelHeader />
      <p className="text-foreground/90 text-sm leading-relaxed">
        {resumo.summary || "Panorama do processo ainda não gerado."}
      </p>

      {resumo.current_status ? (
        <div className="bg-muted/40 flex items-start gap-2 rounded-lg px-3 py-2.5">
          <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-foreground/80 text-sm">
            <span className="text-muted-foreground mr-1 font-medium">
              Agora:
            </span>
            {resumo.current_status}
          </p>
        </div>
      ) : null}

      {resumo.key_dates_and_deadlines.length > 0 ? (
        <dl className="flex flex-col gap-1.5">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <CalendarClock className="size-3.5" /> Prazos
          </dt>
          {resumo.key_dates_and_deadlines.map((k, i) => {
            const urg = URGENCIA_META[k.urgency];
            return (
              <div
                key={`${k.kind}-${i}`}
                className="flex items-center justify-between gap-3 py-1"
              >
                <span className="text-foreground/85 min-w-0 truncate text-sm">
                  {k.kind || "Prazo"}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatDate(k.end_date)} · {countdown(k.days_remaining)}
                  </span>
                  <Badge className={urg.className}>{urg.rotulo}</Badge>
                </span>
              </div>
            );
          })}
        </dl>
      ) : null}

      {resumo.risks.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <CheckCircle2 className="size-3.5" /> Sinais de atenção
          </h4>
          <ul className="flex flex-col gap-1.5">
            {resumo.risks.map((r, i) => (
              <li
                key={`${r.description}-${i}`}
                className="text-foreground/80 flex items-start gap-2 text-sm"
              >
                <span className="bg-destructive/70 mt-1.5 size-1.5 shrink-0 rounded-full" />
                {r.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resumo.recommended_actions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <ListChecks className="size-3.5" /> Próximos passos
          </h4>
          <ul className="flex flex-col gap-1.5">
            {resumo.recommended_actions.map((a, i) => (
              <li
                key={`${a.action}-${i}`}
                className="text-foreground/80 flex items-start gap-2 text-sm"
              >
                <span className="bg-gold mt-1.5 size-1.5 shrink-0 rounded-full" />
                {a.action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground/70 mt-1 border-t pt-3 text-xs">
        Gerado por IA em {formatDateTime(resumo.generated_at)}.
      </p>
    </section>
  );
}

function PanelHeader() {
  return (
    <header className="flex items-center gap-2">
      <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
        <Sparkles className="size-4" />
      </span>
      <h3 className="font-display text-base leading-none">
        Resumo do processo por IA
      </h3>
    </header>
  );
}

function ResumoSkeleton() {
  return (
    <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
      <header className="flex items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-8 animate-pulse items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </span>
        <h3 className="font-display text-base leading-none">Gerando resumo…</h3>
      </header>
      <div className="flex flex-col gap-2.5">
        <div className="bg-muted h-3.5 w-full animate-pulse rounded" />
        <div className="bg-muted h-3.5 w-11/12 animate-pulse rounded" />
        <div className="bg-muted h-3.5 w-4/5 animate-pulse rounded" />
      </div>
    </section>
  );
}
