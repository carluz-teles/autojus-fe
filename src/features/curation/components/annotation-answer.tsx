"use client";

import { useAnnotationAnswer } from "../hooks/use-annotations";

export function AnnotationAnswerPreview({
  annotation,
}: {
  annotation: unknown;
}) {
  const answer = useAnnotationAnswer(annotation);
  if (!answer)
    return (
      <p>
        Rascunho incompleto ou em formato incompatível. O conteúdo original
        permanece preservado no servidor.
      </p>
    );
  return (
    <div className="space-y-4 text-sm">
      <p className="font-medium">{answer.answerability}</p>
      {answer.missingContext.length ? (
        <p>Contexto faltante: {answer.missingContext.join("; ")}</p>
      ) : null}
      {answer.abstentionReason ? (
        <p className="whitespace-pre-wrap">{answer.abstentionReason}</p>
      ) : null}
      {answer.acts.map((act, i) => (
        <div key={i} className="space-y-2 rounded-md border p-4">
          <p className="font-medium">
            Ato {i + 1} · {act.type}
          </p>
          <p>
            {act.recipient} · {act.actionability}
          </p>
          <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
            {act.evidence}
          </blockquote>
          <p>
            {act.kind}
            {act.period ? ` · ${act.period}` : ""}
          </p>
          {act.date ? (
            <p>
              {act.event ?? "Data"}: {act.date}
            </p>
          ) : null}
          <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
            {act.deadlineEvidence}
          </blockquote>
          {act.reason ? (
            <p className="whitespace-pre-wrap">Justificativa: {act.reason}</p>
          ) : null}
          {act.condition ? (
            <p className="whitespace-pre-wrap">Condição: {act.condition}</p>
          ) : null}
          <dl className="space-y-2">
            {act.details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words whitespace-pre-wrap">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
