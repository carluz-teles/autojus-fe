"use client";
import { Button } from "@/components/ui/button";
import { AiFeedback } from "@/features/ai-feedback/components/ai-feedback";
import { useFeedbackScope } from "@/features/ai-feedback/hooks/use-feedback-scope";
import { formatDate } from "@/lib/format";

import { useProcessResume } from "../hooks/use-process-resume";

export function ProcessResume({ processId }: { processId: string }) {
  const scope = useFeedbackScope(`process-resume:${processId}`);
  return scope ? (
    <ScopedResume key={scope.componentKey} processId={processId} />
  ) : null;
}

function ScopedResume({ processId }: { processId: string }) {
  const s = useProcessResume(processId);
  return (
    <section
      className="border-border bg-card rounded-xl border p-4 sm:p-5"
      aria-label="Resumo do processo"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-medium">Resumo do processo</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={s.pending}
          onClick={s.load}
        >
          {s.pending
            ? "Consultando…"
            : s.result
              ? "Consultar novamente"
              : "Consultar resumo"}
        </Button>
      </div>
      {!s.result && !s.error && !s.pending ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Consulte a síntese dos fatos, riscos e próximos passos. Na primeira
          consulta, ela será gerada com os dados disponíveis.
        </p>
      ) : null}
      {s.error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          Não foi possível consultar o resumo. Você pode tentar novamente pelo
          botão acima.
        </p>
      ) : null}
      {s.pending ? (
        <p role="status" className="text-muted-foreground mt-3 text-sm">
          Consultando o resumo do processo…
        </p>
      ) : null}
      {s.result ? (
        <div className="mt-4 flex flex-col gap-4 text-sm wrap-anywhere">
          <p className="text-muted-foreground text-xs">
            Gerado em {formatDate(s.result.generated_at)}
          </p>
          <p className="whitespace-pre-wrap">
            {s.result.summary || "Nenhum resumo narrativo disponível."}
          </p>
          {s.result.current_status ? (
            <p className="whitespace-pre-wrap">{s.result.current_status}</p>
          ) : null}
          {s.result.key_dates_and_deadlines.length ? (
            <div>
              <h4 className="font-medium">Datas e prazos mencionados</h4>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {s.result.key_dates_and_deadlines.map((d, i) => (
                  <li key={i}>
                    {d.kind} · {formatDate(d.end_date)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {s.result.recent_movements.length ? (
            <div>
              <h4 className="font-medium">Movimentações</h4>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {s.result.recent_movements.map((m, i) => (
                  <li key={i}>
                    <span className="text-muted-foreground">
                      {formatDate(m.occurred_at)} ·{" "}
                    </span>
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {s.result.risks.length ? (
            <div>
              <h4 className="font-medium">Riscos identificados</h4>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {s.result.risks.map((r, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {r.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {s.result.recommended_actions.length ? (
            <div>
              <h4 className="font-medium">Próximos passos sugeridos</h4>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {s.result.recommended_actions.map((a, i) => (
                  <li key={i} className="whitespace-pre-wrap">
                    {a.action}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {s.result.ai_result_id ? (
            <AiFeedback
              resultId={s.result.ai_result_id}
              question="Este resumo foi útil?"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
