"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Preserve private command navigation guards. */
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { useReleaseActions, useReleaseDetail } from "../hooks/use-releases";
import {
  type DatasetRelease,
  jobStateLabels,
  type PublicationJob,
} from "../services/dataset-releases";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { RAGIndexPanel } from "./rag-index";
import { ReleaseBlockers, ReleaseManifestView } from "./release-manifest";
export function ReleaseDetail({ id }: { id: string }) {
  const state = useReleaseDetail(id),
    r = state.release.data;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui publicação de datasets.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/releases" className="text-sm underline">
          Voltar aos datasets
        </a>
        <h1 className="font-display text-3xl">{r?.name ?? "Dataset"}</h1>
      </header>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar dataset e publicação
      </Button>
      {state.release.isPending ? (
        <p role="status">Carregando dataset…</p>
      ) : null}
      {state.release.isError ? (
        <p role="alert">Não foi possível atualizar o dataset.</p>
      ) : null}
      {r ? (
        <>
          <section className="space-y-3">
            <p>
              {r.withdrawn
                ? "Dataset retirado"
                : r.eligible
                  ? "Elegível na última consulta"
                  : "Uso bloqueado"}
            </p>
            <ReleaseBlockers blockers={r.blockers} />
            <details>
              <summary className="cursor-pointer text-sm">
                Identidade do manifesto congelado
              </summary>
              <p className="text-xs break-all">SHA256: {r.manifest_digest}</p>
            </details>
          </section>
          <ReleaseManifestView manifest={r.manifest} />
          {r.manifest.purpose === "rag" && state.canEvaluate ? (
            <RAGIndexPanel
              key={r.id + ":" + r.manifest_digest}
              release={r}
              loading={state.release.isFetching || state.release.isError}
            />
          ) : null}
          {state.canEvaluate && r.manifest.purpose === "evaluation" ? (
            <a
              className="inline-block underline"
              href={`/backoffice/releases/${r.id}/evaluations`}
            >
              Preparar e acompanhar avaliações deste dataset
            </a>
          ) : null}
        </>
      ) : null}
      <section className="space-y-3" aria-label="Pedidos de publicação">
        <h2 className="font-display text-2xl">Publicação dos arquivos</h2>
        {state.jobs.isPending ? <p role="status">Carregando pedidos…</p> : null}
        {state.jobs.isError ? (
          <p role="alert">
            Não foi possível atualizar os pedidos. Atualize antes de agir.
          </p>
        ) : null}
        {state.jobs.isSuccess && !state.jobs.data.length ? (
          <p>Nenhum pedido de publicação.</p>
        ) : null}
        {state.jobs.data?.map((job) => (
          <article key={job.id} className="space-y-2 rounded-lg border p-4">
            <p>
              {jobStateLabels[job.state]} · {job.attempts} tentativa(s)
            </p>
            {job.failure_code ? (
              <p className="break-all">Falha registrada: {job.failure_code}</p>
            ) : null}
            <p>
              {job.available
                ? "Arquivo disponível na última consulta"
                : "Arquivo indisponível para novo download"}
            </p>
            <ReleaseBlockers blockers={job.blockers} />
          </article>
        ))}
      </section>
      {r && state.jobs.data ? (
        <ReleaseActions
          release={r}
          jobs={state.jobs.data}
          loading={
            state.release.isFetching ||
            state.release.isError ||
            state.jobs.isFetching ||
            state.jobs.isError
          }
        />
      ) : null}
      <section className="space-y-3" aria-label="Histórico de emissões">
        <h2 className="font-display text-2xl">Emissões de download</h2>
        <p className="text-muted-foreground text-sm">
          Uma emissão comprova autorização e exposição aos gabaritos. Não
          comprova que o arquivo foi salvo por completo.
        </p>
        {state.deliveries.isPending ? (
          <p role="status">Carregando emissões…</p>
        ) : null}
        {state.deliveries.isError ? (
          <p role="alert">Não foi possível carregar o histórico de emissões.</p>
        ) : null}
        {state.deliveries.isSuccess && !state.deliveryItems.length ? (
          <p>Nenhuma emissão registrada.</p>
        ) : null}
        {state.deliveryItems.map((d) => (
          <article
            key={d.id}
            className="space-y-1 rounded-lg border p-4 text-sm"
          >
            <p className="break-all">Emissão {d.id}</p>
            <p>
              {d.issued_at} · {d.bundle_bytes} bytes
            </p>
            <p className="text-muted-foreground break-all">
              SHA256: {d.bundle_digest}
            </p>
          </article>
        ))}
        {state.deliveries.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreDeliveries}
            disabled={state.deliveries.isFetching}
          >
            Carregar mais emissões
          </Button>
        ) : null}
      </section>
    </div>
  );
}
export function ReleaseActions({
  release,
  jobs,
  loading,
}: {
  release: DatasetRelease;
  jobs: PublicationJob[];
  loading: boolean;
}) {
  const state = useReleaseActions(release, jobs, loading),
    { register } = state.form;
  return (
    <section className="space-y-5" aria-label="Ações do dataset">
      <fieldset disabled={state.locked} className="space-y-5">
        <legend className="font-display mb-3 text-2xl">Operar dataset</legend>
        <div className="space-y-3 rounded-lg border p-5">
          <p>
            Publicar grava e verifica os casos de treino e validação elegíveis
            deste dataset. Os casos de teste ficam reservados e não entram nos
            arquivos. A publicação não inicia treinamento nem indexação.
          </p>
          {release.manifest.included_count ===
            release.manifest.split_counts.test && (
            <p role="status">
              Este dataset contém apenas casos reservados de teste. A publicação
              e o download de arquivos estão indisponíveis.
            </p>
          )}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register("publish")}
              disabled={!state.canPublish || state.locked}
            />
            <span>Confirmo a publicação deste dataset.</span>
          </label>
          <Button
            type="button"
            onClick={state.publish}
            disabled={!state.canPublish}
          >
            Publicar arquivos
          </Button>
        </div>
        <div className="space-y-3 rounded-lg border p-5">
          <p>
            O download expõe os gabaritos de treino e validação e impede revisão
            cega posterior dos grupos entregues. Entradas e gabaritos de teste
            ficam fora do arquivo. Uma retirada posterior bloqueia novas
            emissões, mas não apaga uma cópia já entregue.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register("download")}
              disabled={!state.canDownload || state.locked}
            />
            <span>
              Confirmo a exposição aos gabaritos e o download auditado.
            </span>
          </label>
          <Button
            type="button"
            onClick={state.download}
            disabled={!state.canDownload}
          >
            Baixar dataset verificado
          </Button>
        </div>
        <form
          onSubmit={state.withdraw}
          className="space-y-3 rounded-lg border p-5"
        >
          <h3 className="font-medium">Retirar dataset</h3>
          <p>
            Retirada permanente: impede novas publicações e downloads deste
            release.
          </p>
          <Field>
            <FieldLabel htmlFor="release-withdraw-reason">
              Motivo da retirada do dataset
            </FieldLabel>
            <Textarea
              id="release-withdraw-reason"
              {...register("reason")}
              onChangeCapture={state.changeReason}
              disabled={release.withdrawn}
            />
          </Field>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              {...register("withdraw")}
              disabled={release.withdrawn}
            />
            <span>Confirmo a retirada permanente deste dataset.</span>
          </label>
          <Button
            type="submit"
            variant="destructive"
            disabled={release.withdrawn}
          >
            Retirar dataset
          </Button>
        </form>
      </fieldset>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <div className="space-y-2">
          <p>
            O pedido ficou sem confirmação. Recupere o mesmo envio antes de
            outra ação.
          </p>
          <Button
            onClick={state.recover}
            disabled={state.write.mutation.isPending}
          >
            Recuperar ação do dataset
          </Button>
        </div>
      ) : null}
      {state.write.mutation.data?.kind === "publish" ? (
        <p role="status">
          Pedido de publicação registrado. Acompanhe o estado acima.
        </p>
      ) : null}
      {state.write.mutation.data?.kind === "withdraw" ? (
        <p role="status">Retirada do dataset registrada.</p>
      ) : null}
      {state.write.mutation.data?.kind === "download" ? (
        <p role="status" className="break-all">
          Arquivo recebido e verificado; salvamento solicitado ao navegador.
          Emissão: {state.write.mutation.data.receipt.delivery_id}.
        </p>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </section>
  );
}
