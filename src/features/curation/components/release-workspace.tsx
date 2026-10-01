"use client";
import { Button, buttonVariants } from "@/components/ui/button";

import { useReleaseWorkspace } from "../hooks/use-releases";
import { purposeLabel } from "../services/annotation-gold";
export function ReleaseWorkspace() {
  const state = useReleaseWorkspace();
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui publicação de datasets.</p>;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <a href="/backoffice" className="text-sm underline">
          Voltar à bancada
        </a>
        <h1 className="font-display text-3xl">Datasets de curadoria</h1>
        <p className="text-muted-foreground">
          Congele os gabaritos elegíveis de um lote e acompanhe sua publicação
          para avaliação, treinamento ou RAG vetorial.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={state.refresh}>
          Atualizar datasets e lotes
        </Button>
        <a
          href="/backoffice/gold"
          className={buttonVariants({ variant: "outline" })}
        >
          Conferir gold
        </a>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Datasets congelados</h2>
        {state.releases.isPending ? (
          <p role="status">Carregando datasets…</p>
        ) : null}
        {state.releases.isError ? (
          <p role="alert">Não foi possível carregar os datasets.</p>
        ) : null}
        {state.releases.isSuccess && !state.releaseItems.length ? (
          <p>Nenhum dataset congelado.</p>
        ) : null}
        <div className="divide-y rounded-lg border">
          {state.releaseItems.map((r) => (
            <article className="space-y-2 p-4" key={r.id}>
              <h3 className="font-medium">{r.name}</h3>
              <p>
                {purposeLabel(r.purpose)} ·{" "}
                {r.origin === "synthetic" ? "Sintético" : "Real"} ·{" "}
                {r.included_count} incluídos · {r.excluded_count} excluídos
              </p>
              {r.withdrawn ? <p>Retirado</p> : null}
              <a
                className="text-sm underline"
                href={`/backoffice/releases/${r.id}`}
              >
                Consultar publicação de {r.name}
              </a>
            </article>
          ))}
        </div>
        {state.releases.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreReleases}
            disabled={state.releases.isFetching}
          >
            Carregar mais datasets
          </Button>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Lotes para preparar dataset</h2>
        {state.batches.isPending ? (
          <p role="status">Carregando lotes…</p>
        ) : null}
        {state.batches.isError ? (
          <p role="alert">Não foi possível carregar os lotes.</p>
        ) : null}
        {state.batches.isSuccess && !state.batchItems.length ? (
          <p>Prepare um lote de revisão antes de publicar datasets.</p>
        ) : null}
        <div className="divide-y rounded-lg border">
          {state.batchItems.map((b) => (
            <article className="space-y-2 p-4" key={b.id}>
              <p className="break-all">Lote {b.id}</p>
              <p>
                {b.task_count} tarefas ·{" "}
                {b.valid ? "Amostra válida" : "Amostra invalidada"}
              </p>
              <a
                className="text-sm underline"
                href={`/backoffice/releases/prepare/${b.id}`}
              >
                Conferir inclusão e exclusões do lote
              </a>
            </article>
          ))}
        </div>
        {state.batches.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreBatches}
            disabled={state.batches.isFetching}
          >
            Carregar mais lotes
          </Button>
        ) : null}
      </section>
    </div>
  );
}
