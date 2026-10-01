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

import { useImportReview } from "../hooks/use-import-review";
import { useSanitizationReview } from "../hooks/use-sanitization-review";
import {
  type ImportMatter,
  type ImportPrivacyPolicy,
  redactionCategories,
} from "../services/import-admission";
import {
  type ImportBatch,
  type ImportItem,
  importStateLabel,
} from "../services/imports";

const reviewFields = [
  {
    name: "legal_date",
    label: "Data jurídica de referência",
    placeholder: "YYYY-MM-DD",
  },
  {
    name: "knowledge_as_of",
    label: "Conhecimento disponível até",
    placeholder: "2026-09-30T12:00:00-03:00",
  },
  {
    name: "reviewed_at",
    label: "Data e hora desta revisão",
    placeholder: "2026-09-30T12:00:00-03:00",
  },
  {
    name: "review_receipt",
    label: "Referência do registro da revisão",
    placeholder: "Referência auditável da revisão humana",
  },
] as const;

export function ImportReview({
  batchId,
  itemId,
}: {
  batchId: string;
  itemId: string;
}) {
  const workspace = useImportReview(batchId, itemId);
  if (!workspace.allowed)
    return <p role="alert">Seu acesso não inclui admissão de casos.</p>;
  if (workspace.query.isPending)
    return <p role="status">Carregando snapshot e política…</p>;
  if (workspace.query.isError || !workspace.query.data)
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert">Não foi possível carregar a revisão privada.</p>
        <Button variant="outline" onClick={workspace.refresh}>
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <SanitizationReview
      key={itemId}
      {...workspace.query.data}
      refresh={workspace.refresh}
    />
  );
}

function SanitizationReview({
  batch,
  item,
  policy,
  matters,
  refresh,
}: {
  batch: ImportBatch;
  item: ImportItem;
  policy: ImportPrivacyPolicy;
  matters: ImportMatter[];
  refresh: () => void;
}) {
  const { editor, admission } = useSanitizationReview(batch, item, policy);
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/backoffice/imports/${batch.id}`}
        className={buttonVariants({
          variant: "outline",
          className: "self-start",
        })}
      >
        Voltar ao lote
      </Link>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl">
          Privacidade · item {item.row_number}
        </h1>
        <Badge variant="outline">{importStateLabel(item.state)}</Badge>
        <p className="text-muted-foreground">
          Revise o texto e todo o contexto. A versão admitida precisa preservar
          os fatos necessários à análise jurídica.
        </p>
      </header>
      {admission.mutation.isSuccess ? (
        <p role="status" className="rounded-lg border p-4">
          Admissão registrada. O caso aguarda o planejamento da amostra e a
          anotação jurídica.
        </p>
      ) : null}
      {!admission.available ? (
        <p role="alert">
          Este item não está disponível para admissão manual. Confira o estado
          do lote, a política de privacidade e a verificação da origem.
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Snapshot privado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="redaction-field">Campo a revisar</FieldLabel>
              <NativeSelect
                id="redaction-field"
                value={editor.fieldKey}
                onChange={editor.changeField}
              >
                {editor.fields.map((field) => (
                  <NativeSelectOption key={field.key} value={field.key}>
                    {field.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="private-source">
                Selecione um trecho para substituir
              </FieldLabel>
              <Textarea
                id="private-source"
                value={editor.field.text}
                readOnly
                rows={10}
                onSelect={editor.selectText}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="redaction-category">
                Tipo de informação
              </FieldLabel>
              <NativeSelect
                id="redaction-category"
                value={editor.category}
                onChange={editor.changeCategory}
              >
                {redactionCategories.map((category) => (
                  <NativeSelectOption
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={
                  !editor.selection ||
                  admission.mutation.isPending ||
                  !admission.available
                }
                onClick={editor.add}
              >
                Substituir seleção por marcador
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  !editor.redactions.length ||
                  admission.mutation.isPending ||
                  !admission.available
                }
                onClick={editor.undo}
              >
                Desfazer última substituição
              </Button>
            </div>
            {editor.error ? <p role="alert">{editor.error}</p> : null}
            <p className="text-muted-foreground text-sm">
              {editor.redactions.length} substituições. O original permanece
              congelado e privado.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Versão sanitizada · prévia</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {editor.preview.map((field) => (
              <section key={field.key}>
                <h2 className="mb-2 text-sm font-medium">{field.label}</h2>
                <p className="bg-muted max-h-80 overflow-auto rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {field.text || "Não informado"}
                </p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Revisão e finalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={admission.submit}
            noValidate
            className="flex flex-col gap-6"
          >
            <fieldset
              disabled={admission.mutation.isPending || !admission.available}
              className="flex flex-col gap-6"
            >
              <Field>
                <FieldLabel htmlFor="admission-matter">
                  Matéria jurídica
                </FieldLabel>
                <NativeSelect
                  id="admission-matter"
                  {...admission.form.register("matter_key")}
                  aria-invalid={!!admission.form.formState.errors.matter_key}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {matters.map((matter) => (
                    <NativeSelectOption key={matter.Key} value={matter.Key}>
                      {matter.Nome}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError
                  errors={[admission.form.formState.errors.matter_key]}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                {reviewFields.map((field) => (
                  <Field key={field.name}>
                    <FieldLabel htmlFor={`review-${field.name}`}>
                      {field.label}
                    </FieldLabel>
                    <Input
                      id={`review-${field.name}`}
                      placeholder={field.placeholder}
                      {...admission.form.register(field.name)}
                      aria-invalid={
                        !!admission.form.formState.errors[field.name]
                      }
                    />
                    <FieldError
                      errors={[admission.form.formState.errors[field.name]]}
                    />
                  </Field>
                ))}
              </div>
              {admission.real ? (
                <>
                  <div className="bg-muted rounded-lg p-4 text-sm">
                    <p>
                      Política de autorização:{" "}
                      {policy.consent_reference || "Não configurada"}
                    </p>
                    <p>
                      Política de anonimização:{" "}
                      {policy.anonymization_reference || "Não configurada"}
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="admission-consent">
                      Recibo de autorização de uso
                    </FieldLabel>
                    <Input
                      id="admission-consent"
                      {...admission.form.register("consent_receipt")}
                    />
                    <FieldError
                      errors={[admission.form.formState.errors.consent_receipt]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="admission-consent-date">
                      Data e hora da autorização (ISO 8601)
                    </FieldLabel>
                    <Input
                      id="admission-consent-date"
                      {...admission.form.register("consent_confirmed_at")}
                    />
                  </Field>
                </>
              ) : (
                <Field>
                  <FieldLabel htmlFor="admission-dataset">
                    Dataset sintético
                  </FieldLabel>
                  <Input
                    id="admission-dataset"
                    {...admission.form.register("dataset_key")}
                  />
                </Field>
              )}
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 font-medium">
                  Finalidades autorizadas
                </legend>
                <label className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    className="size-4"
                    {...admission.form.register("evaluation")}
                  />
                  Avaliação
                </label>
                <label className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    className="size-4"
                    {...admission.form.register("training")}
                  />
                  Treinamento
                </label>
                <label className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    className="size-4"
                    {...admission.form.register("rag")}
                  />
                  Recuperação vetorial (RAG)
                </label>
                <FieldError
                  errors={[admission.form.formState.errors.evaluation]}
                />
              </fieldset>
              <Field>
                <label className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    className="size-4"
                    {...admission.form.register("privacy_reviewed")}
                  />
                  Revisei a privacidade de todo o texto e contexto da prévia.
                </label>
                <FieldError
                  errors={[admission.form.formState.errors.privacy_reviewed]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="admission-meaning">
                  A sanitização preservou o sentido jurídico?
                </FieldLabel>
                <NativeSelect
                  id="admission-meaning"
                  {...admission.form.register("meaning_status")}
                >
                  <NativeSelectOption value="uncertain">
                    Ainda não é possível confirmar
                  </NativeSelectOption>
                  <NativeSelectOption value="preserved">
                    Sim, os fatos relevantes foram preservados
                  </NativeSelectOption>
                  <NativeSelectOption value="changed">
                    Não, é necessária reconciliação
                  </NativeSelectOption>
                </NativeSelect>
                <FieldError
                  errors={[admission.form.formState.errors.meaning_status]}
                />
              </Field>
            </fieldset>
            {admission.outdated ? (
              <div role="alert" className="flex flex-col items-start gap-3">
                <p>
                  O lote ou a política mudou. Atualize a revisão e confira
                  novamente a privacidade e o sentido jurídico.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={admission.reconcile}
                  disabled={admission.uncertain || admission.mutation.isPending}
                >
                  Atualizar revisão preservando edições
                </Button>
              </div>
            ) : null}
            {admission.form.formState.errors.root?.serverError ? (
              <div role="alert" className="flex flex-col items-start gap-3">
                <p>
                  {admission.form.formState.errors.root.serverError.message}
                </p>
                <Button type="button" variant="outline" onClick={refresh}>
                  Consultar estado atual
                </Button>
              </div>
            ) : null}
            {admission.uncertain ? (
              <div role="alert" className="space-y-2">
                <p>
                  O resultado do último envio não foi confirmado. Retome aquele
                  comando antes de enviar alterações.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={admission.recover}
                  disabled={admission.mutation.isPending}
                >
                  Retomar exatamente a última admissão
                </Button>
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              Admitir registra a procedência e a revisão. O caso ainda passa por
              amostragem, anotação e decisão antes de ser usado como gold.
            </p>
            <Button
              type="submit"
              disabled={
                admission.outdated ||
                admission.uncertain ||
                !admission.available ||
                admission.mutation.isPending
              }
            >
              {admission.mutation.isPending
                ? "Registrando admissão…"
                : "Admitir versão sanitizada"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
