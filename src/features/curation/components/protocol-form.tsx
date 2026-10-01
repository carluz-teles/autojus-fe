"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useProtocolForm } from "../hooks/use-preparation";
import { deadlineUnitOptions } from "../services/annotation-form";
import type {
  AnnotationActOption,
  AnnotationProtocol,
} from "../services/annotation-preparation";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function ProtocolForm({
  previous,
  catalog,
  author,
}: {
  previous: AnnotationProtocol | null;
  catalog: AnnotationActOption[];
  author: boolean;
}) {
  const state = useProtocolForm(previous, catalog),
    { register } = state.form;
  if (state.write.mutation.data)
    return (
      <section className="space-y-4 rounded-lg border p-5">
        <h2 className="font-display text-2xl">
          Protocolo congelado · revisão {state.write.mutation.data.revision}
        </h2>
        <p>{state.write.mutation.data.key}</p>
        <a
          href={`/backoffice/preparation/protocols/${state.write.mutation.data.id}`}
          className={buttonVariants()}
        >
          Consultar protocolo registrado
        </a>
        <a
          href="/backoffice/preparation"
          className={buttonVariants({ variant: "outline" })}
        >
          Preparar lote com o protocolo
        </a>
      </section>
    );
  return (
    <form
      onSubmit={state.submit}
      onChange={state.changeField}
      className="space-y-6"
    >
      <fieldset disabled={state.locked} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="protocol-key">
              Identificador da linhagem
            </FieldLabel>
            <Input
              id="protocol-key"
              {...register("key")}
              readOnly={!!previous}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="protocol-origin">Origem dos casos</FieldLabel>
            <NativeSelect
              id="protocol-origin"
              {...register("origin")}
              disabled={!!previous || state.locked}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              <NativeSelectOption value="synthetic">
                Sintéticos
              </NativeSelectOption>
              <NativeSelectOption value="real" disabled={!author}>
                Reais
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="protocol-matter">Chave da matéria</FieldLabel>
            <Input
              id="protocol-matter"
              {...register("matter_key")}
              readOnly={!!previous}
            />
          </Field>
        </div>
        {!author ? (
          <p className="text-muted-foreground text-sm">
            Sua permissão permite preparar protocolos sintéticos. A origem real
            exige autoria jurídica e habilitação ativa na matéria.
          </p>
        ) : null}
        <fieldset className="space-y-3 rounded-lg border p-5">
          <legend className="px-2 font-medium">Tipos de ato permitidos</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {catalog.map((option) => (
              <label
                key={option.key}
                className="flex items-start gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={option.key}
                  {...register("act_types")}
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span>
                  {option.label}
                  <span className="text-muted-foreground block text-xs break-all">
                    {option.key}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {state.missingTypes.map((key) => (
            <label key={key} className="flex items-start gap-3 text-sm">
              <input type="checkbox" value={key} {...register("act_types")} />
              <span>
                {key} · indisponível no catálogo atual; retire antes de congelar
                a revisão.
              </span>
            </label>
          ))}
        </fieldset>
        <Field>
          <FieldLabel htmlFor="protocol-rubric">
            Orientação de revisão
          </FieldLabel>
          <Textarea id="protocol-rubric" rows={6} {...register("rubric")} />
          <p className="text-muted-foreground text-sm">
            Explique como definir destinatário, ato, prazo, evidências e quando
            registrar contexto insuficiente.
          </p>
        </Field>
        <Field className="max-w-sm">
          <FieldLabel htmlFor="protocol-count">
            Revisões ordinárias por pessoas distintas
          </FieldLabel>
          <NativeSelect
            id="protocol-count"
            {...register("ordinary_reviews", { valueAsNumber: true })}
          >
            <NativeSelectOption value="1">Uma revisão</NativeSelectOption>
            <NativeSelectOption value="2">Duas revisões</NativeSelectOption>
          </NativeSelect>
          <p className="text-muted-foreground text-sm">
            Conflitos e alertas exigem duas revisões. Os controles cegos mantêm
            suas exigências de independência.
          </p>
        </Field>
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Regras de prazo revisadas</h2>
          <p className="text-muted-foreground text-sm">
            Inclua somente regras com fonte e revisão registradas. Sem regras, o
            questionário não poderá atribuir prazo implícito por regra jurídica.
          </p>
          {state.fields.map((field, index) => (
            <fieldset
              key={field.id}
              className="space-y-4 rounded-lg border p-5"
            >
              <legend className="px-2 font-medium">Regra {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`rule-ref-${index}`}>
                    Identificador da regra
                  </FieldLabel>
                  <Input
                    id={`rule-ref-${index}`}
                    {...register(`rules.${index}.reference`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`rule-quantity-${index}`}>
                    Quantidade
                  </FieldLabel>
                  <Input
                    id={`rule-quantity-${index}`}
                    type="number"
                    min={1}
                    {...register(`rules.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`rule-unit-${index}`}>
                    Unidade
                  </FieldLabel>
                  <NativeSelect
                    id={`rule-unit-${index}`}
                    {...register(`rules.${index}.unit`)}
                  >
                    {deadlineUnitOptions.map((option) => (
                      <NativeSelectOption
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`rule-anchor-${index}`}>
                    Evento inicial
                  </FieldLabel>
                  <Input
                    id={`rule-anchor-${index}`}
                    {...register(`rules.${index}.anchor_event`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`rule-start-${index}`}>
                    Regra de início da contagem
                  </FieldLabel>
                  <Input
                    id={`rule-start-${index}`}
                    {...register(`rules.${index}.start_rule`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`rule-citation-${index}`}>
                    Citação jurídica
                  </FieldLabel>
                  <Input
                    id={`rule-citation-${index}`}
                    {...register(`rules.${index}.citation`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`rule-source-${index}`}>
                    Referência da fonte conferida
                  </FieldLabel>
                  <Input
                    id={`rule-source-${index}`}
                    {...register(`rules.${index}.source_reference`)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`rule-note-${index}`}>
                  Nota de revisão da regra
                </FieldLabel>
                <Textarea
                  id={`rule-note-${index}`}
                  {...register(`rules.${index}.review_note`)}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                data-index={index}
                onClick={state.removeRule}
              >
                Remover regra {index + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={state.addRule}
            disabled={state.fields.length >= 256}
          >
            Adicionar regra revisada
          </Button>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="protocol-review-ref">
              Referência do registro de revisão
            </FieldLabel>
            <Input id="protocol-review-ref" {...register("review_reference")} />
            <p className="text-muted-foreground text-sm">
              Protocolos sintéticos usam o prefixo synthetic:. Informe a
              referência verdadeira para casos reais.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="protocol-reviewed">
              Data e hora da revisão, com fuso
            </FieldLabel>
            <Input
              id="protocol-reviewed"
              placeholder="2026-09-30T12:00:00-03:00"
              {...register("reviewed_at")}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="protocol-reason">
            Motivo desta revisão do protocolo
          </FieldLabel>
          <Textarea id="protocol-reason" rows={3} {...register("reason")} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            {...register("confirmed")}
            className="accent-primary mt-0.5 size-4 shrink-0"
          />
          <span>
            Conferi catálogo, rubrica, regras, fontes e os registros de revisão
            informados.
          </span>
        </label>
        <Button type="submit">Congelar revisão do protocolo</Button>
      </fieldset>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <div role="alert" className="space-y-3">
          <p>
            O resultado é desconhecido. Recupere o mesmo envio antes de criar
            outra revisão.
          </p>
          <Button
            type="button"
            onClick={state.recover}
            disabled={state.write.mutation.isPending}
          >
            Recuperar protocolo enviado
          </Button>
        </div>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </form>
  );
}
