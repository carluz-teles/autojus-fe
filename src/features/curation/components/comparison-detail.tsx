"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useComparisonDetail } from "../hooks/use-comparisons";
import { splitLabels } from "../services/sampling";
import { ComparisonCommand } from "./comparison-command";
import { ComparisonReport } from "./comparison-report";

export function ComparisonDetail({ id }: { id: string }) {
  const s = useComparisonDetail(id),
    a = s.actions,
    m = a.metadata.data;
  if (!s.allowed)
    return (
      <p role="alert">
        Comparações exigem permissões de publicação e inferência.
      </p>
    );
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        {m ? (
          <a
            href={`/backoffice/releases/${m.release_id}/comparisons`}
            className="text-sm underline"
          >
            Voltar às comparações do dataset
          </a>
        ) : null}
        <h1 className="font-display text-3xl">Comparação registrada</h1>
        <p>
          Abrir os resultados exige uma nova emissão auditada. Consultar esta
          página não executa IA.
        </p>
      </header>
      <Button
        variant="outline"
        className="self-start"
        onClick={a.refresh}
        disabled={a.write.mutation.isPending}
      >
        Atualizar acesso
      </Button>
      {a.metadata.isPending ? <p role="status">Carregando metadados…</p> : null}
      {a.metadata.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível consultar esta comparação. Verifique o acesso e
            atualize.
          </AlertDescription>
        </Alert>
      ) : null}
      {m ? (
        <>
          <p>
            {splitLabels[m.split]} · {m.source_count} relatórios ·{" "}
            {m.case_count} casos ·{" "}
            {new Date(m.created_at).toLocaleString("pt-BR")}
          </p>
          {m.split === "validation" ? (
            <a
              className="text-sm underline"
              href={`/backoffice/comparisons/${id}/candidate`}
            >
              Selecionar candidato e consultar histórico
            </a>
          ) : null}
          {!m.eligible ? (
            <Alert>
              <AlertDescription>
                Comparação indisponível: uma fonte ou autorização perdeu
                elegibilidade. Os resultados não podem ser reemitidos.
              </AlertDescription>
            </Alert>
          ) : null}
          <ComparisonCommand
            actions={a}
            context={s.context}
            enabled={s.canIssue}
            submit={s.issue}
            label="Abrir resultados"
          />
          <details>
            <summary className="cursor-pointer">
              Identificação da comparação
            </summary>
            <div className="mt-3 flex flex-col gap-1 text-xs break-all">
              <p>Comparação: {m.id}</p>
              <p>Digest: {m.digest}</p>
              {m.source_reports.map((r, i) => (
                <p key={r.report_id}>
                  Fonte {i + 1}: {r.report_id}
                </p>
              ))}
            </div>
          </details>
        </>
      ) : null}
      {a.delivery ? <ComparisonReport delivery={a.delivery} /> : null}
    </div>
  );
}
