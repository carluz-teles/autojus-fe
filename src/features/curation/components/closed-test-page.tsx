"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useClosedTest } from "../hooks/use-closed-test";
import { evaluationStateLabels } from "../services/evaluations";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { ClosedTestPreviewView } from "./closed-test-preview";
import { ClosedTestReportView } from "./closed-test-report";
import { EvaluationTelemetryView } from "./evaluation-telemetry";

const limits = [
  { key: "max_cases", label: "Máximo de casos", min: 1, max: 1000 },
  {
    key: "max_http_calls",
    label: "Máximo de chamadas HTTP",
    min: 0,
    max: 2000,
  },
  {
    key: "max_output_tokens",
    label: "Máximo de tokens de saída",
    min: 0,
    max: 32000000,
  },
] as const;
export function ClosedTestPage({ id }: { id: string }) {
  const s = useClosedTest(id),
    q = s.queries,
    a = s.actions,
    e = s.editor;
  const p = q.baseFresh ? q.reservation.data : undefined,
    r = q.runFresh ? q.run.data : undefined;
  if (!s.allowed)
    return (
      <p role="alert">
        O teste fechado exige permissões internas de publicação e inferência.
      </p>
    );
  return (
    <div className="flex max-w-5xl min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <a
          className="self-start text-sm underline"
          href={`/backoffice/type-candidates/${id}`}
        >
          Voltar ao candidato
        </a>
        <h1 className="font-display text-3xl">Teste fechado de tipo do ato</h1>
        <p>
          Compare a referência e o candidato nos mesmos casos reservados, com
          critérios definidos antes da abertura dos resultados.
        </p>
      </header>
      <Button
        variant="outline"
        className="self-start"
        onClick={q.refresh}
        disabled={
          q.candidate.isFetching ||
          q.reservation.isFetching ||
          a.write.mutation.isPending
        }
      >
        Atualizar teste fechado
      </Button>
      {!q.baseFresh && !q.candidate.isError && !q.reservation.isError ? (
        <p role="status">Conferindo candidato e reserva…</p>
      ) : null}
      {q.candidate.isError ||
      q.reservation.isError ||
      q.release.isError ||
      q.run.isError ||
      q.metadata.isError ? (
        <p role="alert">
          Não foi possível conferir os dados atuais. Verifique o acesso e
          atualize antes de continuar.
        </p>
      ) : null}
      {a.message || e.message ? (
        <p role="alert">{a.message ?? e.message}</p>
      ) : null}
      {a.write.uncertain ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              O resultado do envio é desconhecido. Recupere o pedido original
              antes de iniciar outra ação.
            </p>
            <Button
              className="self-start"
              onClick={a.recover}
              disabled={a.write.mutation.isPending}
            >
              Recuperar envio do teste
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {q.baseFresh && q.reservation.data === null ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>1. Reservar o conjunto</h2>
            </CardTitle>
            <CardDescription>
              Os limites cobrem as duas rotas. O conjunto inteiro precisa caber
              no orçamento; os casos não são escolhidos nesta tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {!e.canPrepare ? (
              <p role="status">
                A reserva depende de candidato e dataset elegíveis e de suporte
                ao teste fechado.
              </p>
            ) : null}
            <form
              onSubmit={e.prepare}
              onChange={e.change}
              className="flex flex-col gap-5"
            >
              <FieldGroup className="grid gap-4 sm:grid-cols-3">
                {limits.map((field) => (
                  <Field
                    key={field.key}
                    data-invalid={!!e.form.formState.errors.limits?.[field.key]}
                  >
                    <FieldLabel htmlFor={`closed-${field.key}`}>
                      {field.label}
                    </FieldLabel>
                    <Input
                      id={`closed-${field.key}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={1}
                      disabled={!e.canPrepare || e.preview.isPending}
                      aria-invalid={
                        !!e.form.formState.errors.limits?.[field.key]
                      }
                      {...e.form.register(`limits.${field.key}`, {
                        valueAsNumber: true,
                      })}
                    />
                    <FieldError
                      errors={[e.form.formState.errors.limits?.[field.key]]}
                    />
                  </Field>
                ))}
              </FieldGroup>
              <Field data-invalid={!!e.form.formState.errors.reason}>
                <FieldLabel htmlFor="closed-reason">
                  Justificativa da reserva
                </FieldLabel>
                <Textarea
                  id="closed-reason"
                  maxLength={4000}
                  disabled={!e.canPrepare || e.preview.isPending}
                  aria-invalid={!!e.form.formState.errors.reason}
                  {...e.form.register("reason")}
                />
                <FieldError errors={[e.form.formState.errors.reason]} />
              </Field>
              <Button
                type="submit"
                className="self-start"
                disabled={!e.canPrepare || e.preview.isPending}
              >
                {e.preview.isPending
                  ? "Conferindo conjunto…"
                  : "Conferir conjunto e orçamento"}
              </Button>
            </form>
            {e.current ? (
              <>
                <ClosedTestPreviewView preview={e.current} />
                <Field orientation="horizontal">
                  <Checkbox
                    id="closed-reserve"
                    checked={e.confirmed}
                    onCheckedChange={e.confirm}
                    disabled={a.locked}
                  />
                  <FieldLabel htmlFor="closed-reserve">
                    Confirmo esta reserva única e os critérios congelados.
                    Reservar não executa o teste.
                  </FieldLabel>
                </Field>
                <Button
                  className="self-start"
                  onClick={e.reserve}
                  disabled={!e.confirmed || a.locked}
                >
                  Reservar teste fechado
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {p ? (
        <>
          <ClosedTestPreviewView preview={p.preview} />
          <p className="text-sm break-all">Reserva registrada: {p.id}</p>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>2. Executar o teste</h2>
              </CardTitle>
              <CardDescription>
                Uma execução por reserva, duas etapas por caso. O acompanhamento
                não reenvia chamadas de IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
              {!p.eligible ? (
                <p role="status" className="break-words">
                  Nova execução bloqueada: {p.blockers.join(" · ")}
                </p>
              ) : null}
              {!p.execution_available ? (
                <p role="status">
                  Execução indisponível na configuração atual.
                </p>
              ) : null}
              {r === null ? (
                <>
                  <p>
                    {p.preview.planned_http_calls > 0
                      ? "Esta execução pode gerar cobrança do provider. Confira os modelos e limites conjuntos acima."
                      : "O conjunto preparado prevê somente processamento local, sem chamadas ao provider."}
                  </p>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="closed-run"
                      checked={a.runConfirmed}
                      onCheckedChange={a.confirmRun}
                      disabled={!a.canExecute}
                    />
                    <FieldLabel htmlFor="closed-run">
                      Autorizo esta execução com os limites congelados.
                    </FieldLabel>
                  </Field>
                  <Button
                    className="self-start"
                    onClick={a.execute}
                    disabled={!a.canExecute || !a.runConfirmed}
                  >
                    Iniciar teste fechado
                  </Button>
                </>
              ) : null}
              {q.run.isFetching ? (
                <p role="status">Atualizando execução…</p>
              ) : null}
              {r ? (
                <>
                  <p role="status" className="font-medium">
                    {evaluationStateLabels[r.state]} · {r.pair_count} casos
                    pareados
                  </p>
                  <dl className="flex flex-wrap gap-5">
                    {Object.entries(r.work_counts).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-muted-foreground text-sm">
                          {evaluationStateLabels[key] ?? key}
                        </dt>
                        <dd className="tabular-nums">{value} etapas</dd>
                      </div>
                    ))}
                  </dl>
                  {!r.eligible && !r.finished_at ? (
                    <p role="status" className="break-words">
                      Acompanhamento automático suspenso:{" "}
                      {r.blockers.join(" · ")}. Atualize o teste após resolver o
                      bloqueio.
                    </p>
                  ) : null}
                  {r.failure_code ? (
                    <p className="break-all">
                      Interrupção registrada: {r.failure_code}
                    </p>
                  ) : null}
                  <p className="text-sm">
                    Reservado até agora: {r.reserved_http_calls} chamadas e{" "}
                    {r.reserved_output_tokens} tokens de saída.
                  </p>
                  <EvaluationTelemetryView
                    telemetry={r.telemetry}
                    unit="Etapas"
                  />
                  <p className="text-muted-foreground text-sm">
                    Concluir o processamento não significa aprovar o candidato.
                    Consumo desconhecido permanece identificado.
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>3. Abrir o relatório</h2>
              </CardTitle>
              <CardDescription>
                Abertura auditada após o término. Consultar metadados não expõe
                resultados; emitir o relatório não executa os modelos novamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!r?.finished_at ? (
                <p>O relatório estará disponível após a execução terminar.</p>
              ) : null}
              {q.metadataFresh && q.metadata.data?.eligible === false ? (
                <p role="alert" className="break-words">
                  Emissão bloqueada: {q.metadata.data.blockers.join(" · ")}
                </p>
              ) : null}
              <Field orientation="horizontal">
                <Checkbox
                  id="closed-report"
                  checked={a.reportConfirmed}
                  onCheckedChange={a.confirmReport}
                  disabled={!a.canIssue}
                />
                <FieldLabel htmlFor="closed-report">
                  Confirmo que a abertura registra minha exposição aos
                  resultados reservados.
                </FieldLabel>
              </Field>
              <Button
                className="self-start"
                onClick={a.issue}
                disabled={!a.canIssue || !a.reportConfirmed}
              >
                Abrir relatório fechado
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
      {a.delivery ? <ClosedTestReportView delivery={a.delivery} /> : null}
      <AnnotationNavigationDialog navigation={s.navigation} />
    </div>
  );
}
