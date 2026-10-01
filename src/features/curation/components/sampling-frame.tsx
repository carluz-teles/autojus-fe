"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useSamplingFrame } from "../hooks/use-sampling";
import { samplingStrata, splitLabels } from "../services/sampling";

const splitOrder = ["train", "validation", "test"] as const;
export function SamplingFramePanel({ id }: { id: string }) {
  const workspace = useSamplingFrame(id),
    frame = workspace.query.data,
    {
      register,
      formState: { errors },
    } = workspace.relation.form;
  if (!workspace.allowed)
    return <p role="alert">Seu acesso não inclui gestão de amostras.</p>;
  if (workspace.query.isPending)
    return <p role="status">Carregando amostra…</p>;
  if (workspace.query.isError || !frame)
    return (
      <div className="space-y-3">
        <p role="alert">Não foi possível carregar a amostra.</p>
        <Button variant="outline" onClick={workspace.refresh}>
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <header className="space-y-2">
        <Link
          href="/backoffice/sampling"
          className="text-muted-foreground text-sm underline"
        >
          Voltar às amostras
        </Link>
        <h1 className="font-display text-3xl">Lote congelado</h1>
        <Badge variant={frame.valid ? "outline" : "destructive"}>
          {frame.valid ? "Reservas ativas" : "Comparação invalidada"}
        </Badge>
        <p>
          {frame.plan.selected_count} casos em {frame.plan.selected_groups}{" "}
          grupos. Déficit total: {frame.plan.deficit}.
        </p>
      </header>
      {!frame.valid ? (
        <div role="alert" className="rounded-md border p-4">
          <p className="font-medium">
            Foram descobertas relações entre grupos de splits diferentes.
          </p>
          <p>
            Este lote deve ser retirado das próximas comparações. Um novo lote
            de reparação excluirá os grupos conflitantes e preservará as demais
            reservas.
          </p>
          <p>
            {frame.invalidations.length} registro(s) de conflito. O manifesto
            original permanece disponível para auditoria.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Composição observada</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Composição por estrato e divisão por grupos
            </caption>
            <thead>
              <tr>
                <th className="p-2">Estrato</th>
                <th className="p-2">Alvo</th>
                <th className="p-2">Selecionados</th>
                <th className="p-2">Déficit</th>
              </tr>
            </thead>
            <tbody>
              {samplingStrata.map((stratum) => (
                <tr className="border-t" key={stratum.value}>
                  <th className="p-2 font-normal">{stratum.label}</th>
                  <td className="p-2">
                    {frame.plan.stratum_targets[stratum.value]}
                  </td>
                  <td className="p-2">
                    {frame.plan.stratum_counts[stratum.value]}
                  </td>
                  <td className="p-2">
                    {frame.plan.stratum_deficits[stratum.value]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {splitOrder.map((split) => (
              <div key={split} className="rounded-md border p-3">
                <p className="font-medium">{splitLabels[split]}</p>
                <p>
                  {frame.plan.split_counts[split]} casos · alvo{" "}
                  {frame.plan.split_targets[split]}
                </p>
                <p className="text-muted-foreground text-sm">
                  {split === "train" ? "Revisão assistida" : "Revisão cega"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Registrar parentesco descoberto</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={workspace.relation.submit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <p className="text-muted-foreground text-sm sm:col-span-2">
              Use para o mesmo processo, republicações ou textos relacionados. A
              relação fica registrada e pode invalidar comparações anteriores.
            </p>
            {(["left", "right"] as const).map((name) => (
              <Field key={name}>
                <FieldLabel htmlFor={`relation-${name}`}>
                  {name === "left" ? "Primeiro caso" : "Segundo caso"}
                </FieldLabel>
                <NativeSelect id={`relation-${name}`} {...register(name)}>
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {workspace.population.data?.sources.map((source) => (
                    <NativeSelectOption
                      key={source.source_link_id}
                      value={source.source_link_id}
                    >
                      {source.source_link_id} · {source.matter_key}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors[name]]} />
              </Field>
            ))}
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="relation-reason">
                Evidência do parentesco
              </FieldLabel>
              <Textarea id="relation-reason" rows={3} {...register("reason")} />
              <FieldError errors={[errors.reason]} />
            </Field>
            {errors.root?.serverError ? (
              <p role="alert" className="sm:col-span-2">
                {errors.root.serverError.message}
              </p>
            ) : null}
            {workspace.population.isError ? (
              <p role="alert" className="sm:col-span-2">
                Não foi possível carregar os casos para relacionar.
              </p>
            ) : null}
            {workspace.relation.mutation.isSuccess ? (
              <p role="status" className="sm:col-span-2">
                Relação registrada.{" "}
                {workspace.relation.mutation.data.conflicts.length} conflito(s)
                entre reservas.
              </p>
            ) : null}
            <Button
              type="submit"
              className="justify-self-start"
              disabled={
                workspace.relation.mutation.isPending ||
                !workspace.population.data
              }
            >
              Registrar relação
            </Button>
          </form>
        </CardContent>
      </Card>
      <details className="rounded-md border p-4">
        <summary className="cursor-pointer font-medium">
          Manifesto e registros selecionados
        </summary>
        <dl className="my-4 space-y-2 text-sm">
          <div>
            <dt>Algoritmo</dt>
            <dd>{frame.plan.algorithm}</dd>
          </div>
          <div>
            <dt>Seed</dt>
            <dd>{frame.plan.seed}</dd>
          </div>
          <div>
            <dt>Digest do manifesto</dt>
            <dd className="font-mono break-all">{frame.manifest_digest}</dd>
          </div>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">Caso</th>
                <th className="p-2">Estrato</th>
                <th className="p-2">Reserva</th>
                <th className="p-2">Inclusão</th>
              </tr>
            </thead>
            <tbody>
              {frame.plan.population.map((item) =>
                item.selected ? (
                  <tr key={item.source_link_id} className="border-t">
                    <td className="p-2 font-mono text-xs">
                      {item.source_link_id}
                    </td>
                    <td className="p-2">{item.stratum}</td>
                    <td className="p-2">
                      {item.split ? splitLabels[item.split] : "—"}
                    </td>
                    <td className="p-2">
                      {item.inclusion_numerator}/{item.inclusion_denominator}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
