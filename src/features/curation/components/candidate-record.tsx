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

import { useCandidateDetail } from "../hooks/use-candidates";
import type { CandidateView } from "../services/candidate-schemas";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import { CandidatePolicyView } from "./candidate-criteria";

export function CandidateRecord({ value }: { value: CandidateView }) {
  const d = value.document;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Candidato congelado</h2>
        </CardTitle>
        <CardDescription>
          {d.origin === "synthetic"
            ? "Dados sintéticos — validação de engenharia"
            : "Dados reais"}{" "}
          · {new Date(d.frozen_at).toLocaleString("pt-BR")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <p className="font-medium">{evaluationPipelineLabels[d.route.mode]}</p>
        <p className="break-words">
          Modelo: {d.route.policy?.model ?? "Execução local"}
        </p>
        <Alert>
          <AlertDescription>
            {value.eligible
              ? "As fontes e autorizações estão elegíveis nesta consulta."
              : "Candidato inelegível: uma fonte ou autorização perdeu validade. O registro histórico foi preservado."}{" "}
            {value.closed_test_available
              ? "O teste fechado tem reserva e confirmações próprias."
              : "O teste reservado ainda não está disponível."}{" "}
            Este registro não ativa nem aprova um modelo em produção.
          </AlertDescription>
        </Alert>
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">Justificativa da seleção</h3>
          <p className="break-words whitespace-pre-wrap">{d.reason}</p>
        </section>
        <CandidatePolicyView policy={d.policy} />
        {value.closed_test_available ? (
          <a
            className="self-start text-sm font-medium underline"
            href={`/backoffice/type-candidates/${d.id}/closed-test`}
          >
            Consultar teste fechado
          </a>
        ) : null}
        <a
          className="text-sm underline"
          href={`/backoffice/type-candidates/${d.id}`}
        >
          Consultar candidato {d.id.slice(-8)}
        </a>
        <details>
          <summary className="cursor-pointer text-sm">
            Configuração e referências congeladas
          </summary>
          <dl className="mt-3 flex flex-col gap-3 text-xs break-all">
            {Object.entries({
              Candidato: d.id,
              Digest: value.digest,
              Comparação: d.comparison_id,
              "Digest da comparação": d.comparison_digest,
              "Relatório de referência": d.baseline_report_id,
              "Relatório escolhido": d.candidate_report_id,
              "Digest do relatório": d.candidate_report_digest,
              Plano: d.plan_id,
              "Definição do plano": d.definition_digest,
              "Digest da rota": d.route_digest,
            }).map(([label, v]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <pre className="mt-4 max-w-full overflow-x-auto text-xs">
            {JSON.stringify(d.route, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
export function CandidateDetail({ id }: { id: string }) {
  const s = useCandidateDetail(id),
    value = s.fresh ? s.query.data : undefined;
  if (!s.allowed)
    return (
      <p role="alert">
        Candidatos exigem permissões de publicação e inferência.
      </p>
    );
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="font-display text-3xl">Seleção registrada</h1>
      <p>
        Consulte a configuração congelada e a validade atual de suas fontes.
      </p>
      <Button
        className="self-start"
        variant="outline"
        disabled={s.query.isFetching}
        onClick={s.refresh}
      >
        Atualizar candidato
      </Button>
      {s.query.isPending || s.query.isFetching ? (
        <p role="status">Conferindo candidato…</p>
      ) : null}
      {s.query.isError ? (
        <p role="alert">
          Não foi possível consultar o candidato. Verifique o acesso e atualize.
        </p>
      ) : null}
      {value ? (
        <>
          <a
            className="text-sm underline"
            href={`/backoffice/comparisons/${value.document.comparison_id}/candidate`}
          >
            Voltar à seleção e ao histórico
          </a>
          <CandidateRecord value={value} />
        </>
      ) : null}
    </div>
  );
}
