"use client";
import { goldBlockerLabel, purposeLabel } from "../services/annotation-gold";
import type {
  ReleaseBlocker,
  ReleaseManifest,
} from "../services/dataset-releases";
import { splitLabels } from "../services/sampling";
export function ReleaseBlockers({ blockers }: { blockers: ReleaseBlocker[] }) {
  return blockers.length ? (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {blockers.map((b, i) => (
        <li className="break-all" key={b.task_id ?? i}>
          {b.task_id ? `Tarefa ${b.task_id}: ` : ""}
          {b.reasons.map(goldBlockerLabel).join(" · ")}
        </li>
      ))}
    </ul>
  ) : null;
}
export function ReleaseManifestView({
  manifest: m,
}: {
  manifest: ReleaseManifest;
}) {
  return (
    <section
      className="space-y-4 rounded-lg border p-5"
      aria-label="Manifesto do dataset"
    >
      <h2 className="font-display text-2xl">
        {m.included_count} incluídos · {m.excluded_count} excluídos
      </h2>
      <p>
        {purposeLabel(m.purpose)} ·{" "}
        {m.origin === "synthetic" ? "Origem sintética" : "Origem real"}
      </p>
      <p>
        Treino: {m.split_counts.train} · Validação: {m.split_counts.validation}{" "}
        · Teste: {m.split_counts.test}
      </p>
      <p className="text-muted-foreground text-sm">
        O manifesto cobre todo o lote. Itens excluídos mantêm seus motivos; os
        controles de validação e teste não entram no treino ou no RAG.
      </p>
      <details>
        <summary className="cursor-pointer font-medium">
          Conferir todos os itens e exclusões
        </summary>
        <div className="mt-4 divide-y">
          {m.items.map((item) => (
            <article key={item.task_id} className="space-y-2 py-4">
              <p className="text-sm break-all">Tarefa {item.task_id}</p>
              <p>
                {item.included ? "Incluído" : "Excluído"} ·{" "}
                {splitLabels[item.split]} · {item.stratum}
              </p>
              {item.reasons.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {item.reasons.map((code) => (
                    <li key={code}>{goldBlockerLabel(code)}</li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground text-sm">
                Probabilidade amostral: {item.inclusion_numerator}/
                {item.inclusion_denominator}
              </p>
              {item.gold_revision_id ? (
                <a
                  className="text-sm underline"
                  href={`/backoffice/gold/revisions/${item.gold_revision_id}`}
                >
                  Consultar revisão gold congelada
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
