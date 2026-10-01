"use client";

import { AiFeedback } from "@/features/ai-feedback/components/ai-feedback";

import type { IntimationAnalysisResult } from "../services/analysis-result";

export function AnalysisResult({
  result,
}: {
  result: IntimationAnalysisResult | null;
}) {
  if (!result) return null;
  return (
    <details
      key={result.ai_result_id}
      className="border-border bg-card rounded-xl border p-4"
    >
      <summary className="focus-visible:ring-ring cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2">
        Análise original da IA
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm wrap-anywhere">
        <p className="font-medium">{result.ato}</p>
        {result.contexto ? (
          <dl className="flex flex-col gap-2">
            <div>
              <dt className="font-medium">Situação</dt>
              <dd className="whitespace-pre-wrap">
                {result.contexto.situacao}
              </dd>
            </div>
            <div>
              <dt className="font-medium">O que aconteceu</dt>
              <dd className="whitespace-pre-wrap">
                {result.contexto.o_que_aconteceu}
              </dd>
            </div>
            <div>
              <dt className="font-medium">O que se espera</dt>
              <dd className="whitespace-pre-wrap">
                {result.contexto.o_que_se_espera}
              </dd>
            </div>
            {result.contexto.fundamentos.map((f, i) => (
              <div key={`${f.ref}:${i}`}>
                <dt className="font-medium">{f.norma}</dt>
                <dd className="whitespace-pre-wrap">{f.citacao}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {result.providencias.length ? (
          <div>
            <p className="font-medium">Providências sugeridas nesta análise</p>
            <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
              {result.providencias.map((p, i) => (
                <li key={i}>
                  <p className="font-medium">{p.title}</p>
                  <p className="whitespace-pre-wrap">{p.description}</p>
                  {p.due_date ? <p>Data sugerida: {p.due_date}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Resposta preservada como foi gerada. O feedback não altera as
          providências ou os prazos do processo.
        </p>
        <AiFeedback
          resultId={result.ai_result_id}
          question="Esta análise foi útil?"
        />
      </div>
    </details>
  );
}
