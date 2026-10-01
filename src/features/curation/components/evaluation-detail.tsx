"use client";

import { Button } from "@/components/ui/button";

import { useEvaluationDetail } from "../hooks/use-evaluations";
import { evaluationRunCounts } from "../services/evaluation-presentation";
import { evaluationStateLabels } from "../services/evaluations";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import {
  EvaluationReportView,
  EvaluationTelemetryView,
} from "./evaluation-report";
import { EvaluationPreviewView } from "./evaluation-workspace";

export function EvaluationDetail({ id }: { id: string }) {
  const state = useEvaluationDetail(id),
    p = state.plan.data,
    r = state.run.data;
  if (!state.allowed)
    return (
      <p role="alert">
        Avaliações exigem permissões de publicação e inferência.
      </p>
    );
  return (
    <div className="max-w-5xl min-w-0 space-y-6">
      <header className="space-y-2">
        <a
          className="text-sm underline"
          href={
            p
              ? `/backoffice/releases/${p.preview.selection.release_id}/evaluations`
              : "/backoffice/releases"
          }
        >
          Voltar aos planos do dataset
        </a>
        <h1 className="font-display text-3xl">Avaliação de intimações</h1>
        <p>
          Plano congelado, execução acompanhada e relatório com emissão
          auditada.
        </p>
      </header>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar avaliação
      </Button>
      {state.plan.isPending || state.run.isPending ? (
        <p role="status">Carregando plano e execução…</p>
      ) : null}
      {state.plan.isError || state.run.isError ? (
        <p role="alert">
          Não foi possível atualizar a avaliação. Verifique sua sessão e acesso.
        </p>
      ) : null}
      {p ? (
        <>
          <EvaluationPreviewView preview={p.preview} />
          {!p.eligible ? (
            <p className="break-all">
              Plano indisponível para nova execução: {p.blockers.join(" · ")}
            </p>
          ) : null}
          <section
            className="space-y-4 rounded-lg border p-5"
            aria-label="Execução da avaliação"
          >
            <h2 className="font-display text-2xl">2. Executar avaliação</h2>
            {!p.execution_available ? (
              <p role="status">
                Execução indisponível para este pipeline na configuração atual.
              </p>
            ) : null}
            {p.preview.planned_http_calls > 0 ? (
              <p>
                Executar pode gerar cobrança do provider configurado. Confira o
                modelo e o máximo de chamadas e tokens de saída acima.
              </p>
            ) : (
              <p>Este plano prevê somente processamento local.</p>
            )}
            {!r && state.run.isSuccess && p.execution_available ? (
              <>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={state.runConfirmed}
                    onChange={state.confirmRun}
                    disabled={!state.canExecute}
                  />
                  <span>
                    {p.preview.planned_http_calls > 0
                      ? "Autorizo esta execução de IA com os limites congelados."
                      : "Confirmo a execução local deste plano."}
                  </span>
                </label>
                <Button
                  onClick={state.execute}
                  disabled={!state.canExecute || !state.runConfirmed}
                >
                  Iniciar execução de avaliação
                </Button>
              </>
            ) : null}
            {r ? (
              <div className="space-y-4" aria-live="polite">
                <p className="font-medium">{evaluationStateLabels[r.state]}</p>
                {r.failure_code ? (
                  <p className="break-all">
                    Motivo registrado: {r.failure_code}
                  </p>
                ) : null}
                <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {evaluationRunCounts(r).map((row) => (
                    <li key={row.code}>
                      {row.label}: {row.count}
                    </li>
                  ))}
                </ul>
                <p>
                  Reservadas: {r.reserved_http_calls} chamadas ·{" "}
                  {r.reserved_output_tokens} tokens de saída
                </p>
                <EvaluationTelemetryView telemetry={r.telemetry} />
                {r.state === "uncertain" ? (
                  <p>
                    O resultado da execução ficou incerto. As chamadas
                    reservadas não são reenviadas automaticamente.
                  </p>
                ) : null}
                {r.state === "completed" ? (
                  <p>
                    O processamento pode incluir falhas. Consulte os resultados
                    antes de concluir sobre a qualidade.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
          {r?.finished_at && r.report_available === false ? (
            <p role="status">
              Execução registrada. O relatório comparativo de tipo ainda não
              está disponível.
            </p>
          ) : null}
          {r?.finished_at && r.report_available !== false ? (
            <section
              className="space-y-4 rounded-lg border p-5"
              aria-label="Emissão do relatório"
            >
              <h2 className="font-display text-2xl">3. Abrir relatório</h2>
              <p>
                A emissão expõe resultados comparados com os golds e impede sua
                revisão cega posterior dos grupos envolvidos. Não chama o
                modelo.
              </p>
              {state.metadata.isPending ? (
                <p role="status">Verificando relatório…</p>
              ) : null}
              {state.metadata.isError ? (
                <p role="alert">
                  Não foi possível conferir a disponibilidade do relatório.
                </p>
              ) : null}
              {state.metadata.data?.eligible === false ? (
                <p role="alert" className="break-all">
                  Emissão indisponível:{" "}
                  {state.metadata.data.blockers.join(" · ")}
                </p>
              ) : null}
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={state.reportConfirmed}
                  onChange={state.confirmReport}
                  disabled={!state.canIssue}
                />
                <span>
                  Confirmo a exposição aos resultados e a emissão auditada.
                </span>
              </label>
              <Button
                onClick={state.issue}
                disabled={!state.canIssue || !state.reportConfirmed}
              >
                {state.metadata.data
                  ? "Abrir relatório com nova emissão"
                  : "Gerar e abrir relatório"}
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p>
            Pedido sem confirmação. Recupere o mesmo envio; nenhuma outra ação
            será enviada enquanto houver incerteza.
          </p>
          <Button
            onClick={state.recover}
            disabled={state.write.mutation.isPending}
          >
            Recuperar ação da avaliação
          </Button>
        </div>
      ) : null}
      {state.delivery ? (
        <EvaluationReportView delivery={state.delivery} />
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </div>
  );
}
