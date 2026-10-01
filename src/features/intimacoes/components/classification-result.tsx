"use client";

import { useState } from "react";

import { AiFeedback } from "@/features/ai-feedback/components/ai-feedback";

import type { DeadlineClassificationResult } from "../services/classification-result";

export function ClassificationResult({
  result,
}: {
  result: DeadlineClassificationResult | null;
}) {
  return result ? (
    <ClassificationDisclosure key={result.id} result={result} />
  ) : null;
}

function ClassificationDisclosure({
  result,
}: {
  result: DeadlineClassificationResult;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="border-border bg-card rounded-xl border p-4"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="focus-visible:ring-ring cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2">
        Sugestão original de ato e prazo
      </summary>
      {open ? (
        <div className="mt-3 space-y-3 text-sm wrap-anywhere">
          <p className="text-muted-foreground text-xs">
            Gerada em {result.date}
          </p>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Ato sugerido</dt>
              <dd>{result.suggestion}</dd>
            </div>
            {result.alternative ? (
              <div>
                <dt className="font-medium">Alternativa indicada</dt>
                <dd>{result.alternative}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium">
                Classificação após as verificações
              </dt>
              <dd>{result.resolved}</dd>
            </div>
            {result.period ? (
              <div>
                <dt className="font-medium">Contagem pelas regras</dt>
                <dd>
                  {result.period}, a partir de {result.start}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium">Data calculada naquela versão</dt>
              <dd>{result.end}</dd>
            </div>
            {result.citation ? (
              <div>
                <dt className="font-medium">Base do cálculo</dt>
                <dd className="whitespace-pre-wrap">{result.citation}</dd>
              </div>
            ) : null}
          </dl>
          {result.review ? (
            <p className="font-medium">{result.review}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            O ato foi sugerido pela análise; a contagem usa regras e calendário.
            Esta resposta foi preservada. Consulte os campos de prazo para os
            valores atuais.
          </p>
          <AiFeedback
            resultId={result.id}
            question="Esta sugestão de ato e prazo foi útil?"
          />
        </div>
      ) : null}
    </details>
  );
}
