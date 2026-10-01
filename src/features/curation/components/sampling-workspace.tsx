"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import {
  useSamplingForm,
  useSamplingSource,
  useSamplingWorkspace,
} from "../hooks/use-sampling";
import { importContextLabels as contextLabels } from "../services/import-context";
import {
  type SamplingPopulation,
  samplingStrata,
  splitLabels,
} from "../services/sampling";

export function SamplingSourcePreview({ id }: { id: string }) {
  const source = useSamplingSource(id);
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={source.toggle}
        aria-expanded={source.opened}
        aria-controls={`source-${id}`}
      >
        {source.opened ? "Fechar teor sanitizado" : "Ler teor sanitizado"}
      </Button>
      {source.opened ? (
        <div id={`source-${id}`} className="bg-muted/40 rounded-md border p-4">
          {source.query.isPending ? (
            <p role="status">Carregando caso…</p>
          ) : source.query.isError ? (
            <p role="alert">Não foi possível carregar o caso.</p>
          ) : source.query.data ? (
            <>
              <p className="whitespace-pre-wrap">
                {source.query.data.facts.text}
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
                {source.context.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">
                      {contextLabels[key] ?? key}
                    </dt>
                    <dd className="whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SamplingWorkspace() {
  const workspace = useSamplingWorkspace();
  if (!workspace.allowed)
    return <p role="alert">Seu acesso não inclui gestão de amostras.</p>;
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="space-y-2">
        <Link
          href="/backoffice"
          className="text-muted-foreground text-sm underline"
        >
          Voltar à bancada
        </Link>
        <h1 className="font-display text-3xl">Amostras de intimações</h1>
        <p className="text-muted-foreground">
          Congele a população e reserve grupos antes de gerar sugestões.
        </p>
      </header>
      <Button
        variant="outline"
        onClick={workspace.refresh}
        className="self-start"
      >
        Atualizar população e lotes
      </Button>
      {workspace.population.isPending ? (
        <p role="status">Carregando população admitida…</p>
      ) : workspace.population.isError ? (
        <p role="alert">Não foi possível carregar a população.</p>
      ) : workspace.population.data ? (
        <SamplingForm population={workspace.population.data} />
      ) : null}
      <section className="space-y-3" aria-label="Lotes congelados">
        <h2 className="font-display text-xl">Lotes congelados</h2>
        {workspace.frames.isError ? (
          <p role="alert">Não foi possível carregar os lotes.</p>
        ) : workspace.frames.isPending ? (
          <p role="status">Carregando lotes…</p>
        ) : workspace.summaries.length === 0 ? (
          <p>Nenhum lote congelado.</p>
        ) : (
          workspace.summaries.map((frame) => (
            <Card key={frame.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <div>
                  <p className="font-medium">{frame.lineage_key}</p>
                  <p className="text-muted-foreground text-sm">
                    {frame.selected_count} casos selecionados
                  </p>
                  <Badge variant={frame.valid ? "outline" : "destructive"}>
                    {frame.valid ? "Congelado" : "Comparação invalidada"}
                  </Badge>
                </div>
                <Link
                  href={`/backoffice/sampling/${frame.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Consultar lote
                </Link>
              </CardContent>
            </Card>
          ))
        )}
        {workspace.frames.hasNextPage ? (
          <Button
            variant="outline"
            onClick={workspace.loadMore}
            disabled={workspace.frames.isFetchingNextPage}
          >
            Mais lotes
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function SamplingForm({ population }: { population: SamplingPopulation }) {
  const state = useSamplingForm(population),
    {
      register,
      formState: { errors },
    } = state.form;
  return (
    <form onSubmit={state.submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Definir o recorte</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="lineage">Linhagem do benchmark</FieldLabel>
            <Input id="lineage" {...register("lineage_key")} />
            <FieldError errors={[errors.lineage_key]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="seed">Seed do sorteio</FieldLabel>
            <Input id="seed" {...register("seed")} />
            <FieldError errors={[errors.seed]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="origin">Origem</FieldLabel>
            <NativeSelect id="origin" {...register("origin")}>
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              <NativeSelectOption value="real">
                Casos reais autorizados
              </NativeSelectOption>
              <NativeSelectOption value="synthetic">
                Casos sintéticos
              </NativeSelectOption>
            </NativeSelect>
            <FieldError errors={[errors.origin]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="matter">Matéria</FieldLabel>
            <NativeSelect id="matter" {...register("matter_key")}>
              <NativeSelectOption value="">
                Todas as matérias
              </NativeSelectOption>
              {state.matters.map((matter) => (
                <NativeSelectOption key={matter} value={matter}>
                  {matter}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="size">Tamanho desejado do lote</FieldLabel>
            <Input
              id="size"
              type="number"
              min={1}
              max={1000}
              {...register("sample_size", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.sample_size]} />
          </Field>
          <p className="text-muted-foreground text-sm sm:col-span-2">
            Composição: 40% resolvidos, 30% resíduo, 20% raros e 10% contexto
            insuficiente. A reserva por grupos busca 60% treino, 20% validação e
            20% teste. O manifesto registra os déficits e as proporções obtidas.
          </p>
        </CardContent>
      </Card>
      {state.outdated ? (
        <div role="alert" className="space-y-2 rounded-md border p-4">
          <p>
            A população mudou. Confira os novos casos antes de continuar; sua
            triagem foi preservada.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={state.reconcile}
            disabled={state.uncertain || state.mutation.isPending}
          >
            Reconciliar com a população atual
          </Button>
        </div>
      ) : null}
      <section className="space-y-4" aria-label="Triagem da população">
        <h2 className="font-display text-xl">
          {state.eligibleCount} casos elegíveis para triagem
        </h2>
        <p className="text-muted-foreground text-sm">
          Escolha um estrato por caso com base na evidência disponível. Essa
          triagem organiza a coleta; ela não aprova um rótulo jurídico.
        </p>
        {state.visible.map((source) => (
          <Card key={source.source_link_id}>
            <CardHeader>
              <CardTitle>
                Caso {source.number} · {source.matter_key}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Data jurídica: {source.legal_date}
              </p>
              {source.reserved_split ? (
                <Badge variant="outline">
                  Reserva preservada: {splitLabels[source.reserved_split]}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <SamplingSourcePreview id={source.source_link_id} />
              <Field>
                <FieldLabel htmlFor={`stratum-${source.source_link_id}`}>
                  Estrato do caso {source.number}
                </FieldLabel>
                <NativeSelect
                  id={`stratum-${source.source_link_id}`}
                  {...register(`screening.${source.source_link_id}.stratum`)}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {samplingStrata.map((stratum) => (
                    <NativeSelectOption
                      key={stratum.value}
                      value={stratum.value}
                    >
                      {stratum.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`reason-${source.source_link_id}`}>
                  Justificativa da triagem
                </FieldLabel>
                <Textarea
                  id={`reason-${source.source_link_id}`}
                  rows={2}
                  {...register(`screening.${source.source_link_id}.reason`)}
                />
              </Field>
            </CardContent>
          </Card>
        ))}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={state.previous}
            disabled={state.page === 1}
          >
            Página anterior
          </Button>
          <span className="text-sm">
            {state.page} de {state.pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={state.next}
            disabled={state.page === state.pageCount}
          >
            Próxima página
          </Button>
        </div>
      </section>
      {errors.root?.serverError ? (
        <p role="alert">{errors.root.serverError.message}</p>
      ) : null}
      {state.uncertain ? (
        <div role="alert" className="space-y-2 rounded-md border p-4">
          <p>
            O resultado do último envio não foi confirmado. Retome aquele
            comando antes de enviar alterações.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={state.recover}
            disabled={state.mutation.isPending}
          >
            Retomar exatamente o último envio
          </Button>
        </div>
      ) : null}
      <Button
        type="submit"
        disabled={
          state.mutation.isPending ||
          state.uncertain ||
          state.outdated ||
          state.eligibleCount === 0
        }
      >
        {state.mutation.isPending
          ? "Congelando…"
          : "Congelar amostra e reservas"}
      </Button>
    </form>
  );
}
