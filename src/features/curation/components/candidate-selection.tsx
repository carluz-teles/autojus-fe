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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useCandidateSelection } from "../hooks/use-candidates";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import {
  CandidatePolicyView,
  CandidateRuleFields,
  CandidateStratumFields,
} from "./candidate-criteria";
import { CandidateRecord } from "./candidate-record";
import { ComparisonCommand } from "./comparison-command";
import { ComparisonReport } from "./comparison-report";

export function CandidateSelection({ id }: { id: string }) {
  const s = useCandidateSelection(id),
    a = s.comparison.actions,
    m = a.metadata.data,
    c = s.delivery?.document.comparison;
  if (!s.allowed)
    return (
      <p role="alert">
        Selecionar candidatos exige permissões de publicação e inferência.
      </p>
    );
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <a className="text-sm underline" href={`/backoffice/comparisons/${id}`}>
          Voltar à comparação
        </a>
        <h1 className="font-display text-3xl">Selecionar candidato de tipo</h1>
        <p>
          Escolha a configuração e os critérios que serão preservados para a
          próxima avaliação. Esta seleção cobre somente o tipo do ato.
        </p>
      </header>
      <Button
        className="self-start"
        variant="outline"
        onClick={s.refresh}
        disabled={s.write.mutation.isPending || a.write.mutation.isPending}
      >
        Atualizar acesso e histórico
      </Button>
      {a.metadata.isPending ? (
        <p role="status">Carregando comparação…</p>
      ) : null}
      {a.metadata.isError ? (
        <p role="alert">
          Não foi possível consultar a comparação. Verifique o acesso e
          atualize.
        </p>
      ) : null}
      {m && (!m.eligible || m.split !== "validation") ? (
        <Alert>
          <AlertDescription>
            {m.split !== "validation"
              ? "A seleção exige uma comparação do conjunto de validação."
              : "Comparação indisponível: uma fonte ou autorização perdeu elegibilidade."}
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>1. Conferir a comparação</h2>
          </CardTitle>
          <CardDescription>
            Abra os resultados por emissão auditada antes de escolher o
            candidato. A consulta não repete inferência.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ComparisonCommand
            actions={a}
            context={s.comparison.context}
            enabled={s.comparison.canIssue && m?.split === "validation"}
            submit={s.comparison.issue}
            label="Abrir comparação para selecionar"
          />
          {s.delivery ? (
            <details>
              <summary className="cursor-pointer font-medium">
                Consultar resultados da validação
              </summary>
              <div className="mt-5">
                <ComparisonReport delivery={s.delivery} />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
      {s.receipt ? <CandidateRecord value={s.receipt} /> : null}
      {s.write.mutation.isSuccess && s.saved.query.isFetching ? (
        <p role="status">Seleção registrada; conferindo elegibilidade atual…</p>
      ) : null}
      {s.write.mutation.isSuccess && s.saved.query.isError ? (
        <p role="alert">
          Seleção registrada, mas não foi possível consultar a elegibilidade
          atual. Atualize o acesso antes de continuar.
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>2. Definir a seleção</h2>
          </CardTitle>
          <CardDescription>
            Preencha os limites do experimento. O servidor verificará os
            critérios nos relatórios congelados; amostras insuficientes impedem
            a seleção.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!s.delivery ? (
            <p>Abra a comparação para habilitar os campos.</p>
          ) : (
            <p>
              {c?.origin === "synthetic"
                ? "Dados sintéticos — validação de engenharia"
                : "Dados reais"}{" "}
              · {c?.cases.length} casos de validação.
            </p>
          )}
          <FieldSet disabled={!s.ready}>
            <FieldLegend className="sr-only">
              Fontes e critérios do candidato
            </FieldLegend>
            <FieldGroup>
              {(["baseline", "candidate"] as const).map((field) => (
                <Field key={field} data-invalid={!!s.errors[field]}>
                  <FieldLabel htmlFor={`candidate-${field}`}>
                    {field === "baseline"
                      ? "Fonte de referência"
                      : "Fonte candidata"}
                  </FieldLabel>
                  <NativeSelect
                    id={`candidate-${field}`}
                    className="w-full"
                    value={s.form[field]}
                    aria-invalid={!!s.errors[field]}
                    aria-describedby={
                      s.errors[field] ? `candidate-${field}-error` : undefined
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      s.change((f) => ({ ...f, [field]: value }));
                    }}
                  >
                    <NativeSelectOption value="">
                      Escolher fonte…
                    </NativeSelectOption>
                    {c?.sources.map((source, i) => (
                      <NativeSelectOption
                        key={source.report_id}
                        value={source.report_id}
                      >
                        Fonte {i + 1} ·{" "}
                        {evaluationPipelineLabels[source.pipeline.id]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {s.errors[field] ? (
                    <FieldError id={`candidate-${field}-error`}>
                      {s.errors[field]}
                    </FieldError>
                  ) : null}
                </Field>
              ))}
              <FieldSet>
                <FieldLegend>Critérios gerais</FieldLegend>
                <FieldDescription>
                  Percentuais de 0 a 100, com até duas casas decimais. Todos os
                  casos entram no denominador, incluindo falhas. Aceitável
                  significa acerto de tipo ou abstenção apropriada. Sinal
                  crítico indica risco para revisão jurídica. Regressão é um
                  caso aceitável na referência que deixa de sê-lo no candidato.
                </FieldDescription>
                <CandidateRuleFields
                  value={s.form.overall}
                  prefix="overall"
                  errors={s.errors}
                  change={(overall) => s.change((f) => ({ ...f, overall }))}
                />
              </FieldSet>
              <FieldSet>
                <FieldLegend>Decidir por estrato</FieldLegend>
                <FieldDescription>
                  Exigir um estrato sem casos suficientes bloqueia o
                  congelamento. Não exigir critérios próprios mantém seus casos
                  nas métricas gerais.
                </FieldDescription>
                <CandidateStratumFields
                  form={s.form}
                  change={s.change}
                  errors={s.errors}
                  coverage={(key) => {
                    const v = c?.pairs[0]?.strata[key];
                    return v
                      ? `${v.cases} casos / ${v.groups} grupos disponíveis.`
                      : "Cobertura indisponível.";
                  }}
                />
              </FieldSet>
              <Field data-invalid={!!s.errors.reason}>
                <FieldLabel htmlFor="candidate-reason">
                  Justificativa da seleção
                </FieldLabel>
                <Textarea
                  id="candidate-reason"
                  value={s.form.reason}
                  maxLength={4000}
                  aria-invalid={!!s.errors.reason}
                  aria-describedby={
                    s.errors.reason ? "candidate-reason-error" : undefined
                  }
                  onChange={(e) => {
                    const reason = e.target.value;
                    s.change((f) => ({ ...f, reason }));
                  }}
                />
                {s.errors.reason ? (
                  <FieldError id="candidate-reason-error">
                    {s.errors.reason}
                  </FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </FieldSet>
          <Button
            className="self-start"
            variant="outline"
            onClick={s.review}
            disabled={!s.ready}
          >
            Conferir seleção
          </Button>
          {s.reviewedBody ? (
            <section
              aria-label="Seleção conferida"
              className="flex flex-col gap-4 rounded-lg border p-4"
            >
              <h3 className="font-medium">Revisar antes de congelar</h3>
              <p>
                Referência: fonte{" "}
                {(c?.sources.findIndex(
                  (v) => v.report_id === s.reviewedBody!.baseline_report_id,
                ) ?? -1) + 1}{" "}
                · Candidato: fonte{" "}
                {(c?.sources.findIndex(
                  (v) => v.report_id === s.reviewedBody!.candidate_report_id,
                ) ?? -1) + 1}
              </p>
              <CandidatePolicyView policy={s.reviewedBody.policy} />
              <p className="break-words whitespace-pre-wrap">
                {s.reviewedBody.reason}
              </p>
              <Field orientation="horizontal">
                <Checkbox
                  id="candidate-confirmation"
                  checked={s.checked}
                  disabled={!s.ready}
                  onCheckedChange={s.confirm}
                />
                <FieldLabel htmlFor="candidate-confirmation">
                  Confirmo estas fontes, critérios e justificativa para congelar
                  o candidato.
                </FieldLabel>
              </Field>
            </section>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={s.freeze} disabled={!s.ready || !s.checked}>
              {s.write.mutation.isPending
                ? "Congelando candidato…"
                : "Congelar candidato"}
            </Button>
            {s.write.uncertain ? (
              <Button
                variant="outline"
                onClick={s.recover}
                disabled={s.write.mutation.isPending}
              >
                Recuperar seleção original
              </Button>
            ) : null}
          </div>
          {s.message ? (
            <Alert variant="destructive">
              <AlertDescription>{s.message}</AlertDescription>
            </Alert>
          ) : null}
          {s.write.uncertain ? (
            <Alert>
              <AlertDescription>
                A resposta se perdeu. Recupere a seleção original antes de
                editar ou enviar outro pedido.
              </AlertDescription>
            </Alert>
          ) : null}
          <p className="text-muted-foreground text-sm">
            Congelar não executa IA, não abre o teste reservado e não ativa um
            modelo. Atender aos critérios escolhidos não comprova qualidade
            jurídica ou representatividade da amostra.
          </p>
        </CardContent>
      </Card>
      <section
        aria-label="Histórico de candidatos"
        className="flex flex-col gap-4"
      >
        <h2 className="font-display text-2xl">Candidatos deste dataset</h2>
        {s.history.isPending && m ? (
          <p role="status">Carregando histórico…</p>
        ) : null}
        {s.history.isError ? (
          <p role="alert">
            Não foi possível consultar os candidatos. Atualize para conferir.
          </p>
        ) : null}
        {s.history.isSuccess && !s.items.length ? (
          <p>Nenhum candidato congelado.</p>
        ) : null}
        {!s.history.isError
          ? s.items.map((v) => (
              <a
                key={v.id}
                className="text-sm underline"
                href={`/backoffice/type-candidates/${v.id}`}
              >
                Candidato {v.id.slice(-8)} ·{" "}
                {new Date(v.frozen_at).toLocaleString("pt-BR")}
              </a>
            ))
          : null}
        {s.history.hasNextPage ? (
          <Button
            variant="outline"
            className="self-start"
            onClick={s.more}
            disabled={s.history.isFetching}
          >
            Carregar mais candidatos
          </Button>
        ) : null}
      </section>
    </div>
  );
}
