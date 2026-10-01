import { z } from "zod";

import type { ImportInput } from "./imports";

export const importFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do lote.").max(200),
    mode: z.enum(["manual", "json"]),
    text: z.string(),
    origin: z.enum(["", "real", "synthetic"]),
    source_reference: z.string(),
    captured_at: z.string(),
    group_key: z.string(),
    court: z.string(),
    procedure: z.string(),
    channel: z.string(),
    structured_text: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "json") {
      if (!value.structured_text.trim())
        ctx.addIssue({
          code: "custom",
          path: ["structured_text"],
          message: "Cole ou selecione o arquivo JSON.",
        });
      return;
    }
    for (const field of manualImportFields) {
      if (!value[field.name].trim())
        ctx.addIssue({
          code: "custom",
          path: [field.name],
          message: "Preencha este campo.",
        });
    }
    if (!value.text.trim())
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Informe o teor da intimação.",
      });
    if (!value.origin)
      ctx.addIssue({
        code: "custom",
        path: ["origin"],
        message: "Declare a origem dos dados.",
      });
  });
export type ImportForm = z.infer<typeof importFormSchema>;
export const manualImportFields = [
  {
    name: "source_reference",
    label: "Referência da fonte",
    placeholder: "Identificação que permita conferir a procedência",
  },
  {
    name: "captured_at",
    label: "Data da captura (ISO 8601)",
    placeholder: "2026-09-30T12:00:00-03:00",
  },
  {
    name: "group_key",
    label: "Grupo do processo",
    placeholder: "Identificador consistente para ocorrências do mesmo processo",
  },
  { name: "court", label: "Tribunal", placeholder: "Tribunal de origem" },
  {
    name: "procedure",
    label: "Procedimento",
    placeholder: "Rito comum, JEC ou não informado",
  },
  {
    name: "channel",
    label: "Canal",
    placeholder: "Diário, portal ou outro canal identificado",
  },
] as const;

export function importItemsJSON(form: ImportForm) {
  if (form.mode === "json") return form.structured_text;
  const input: ImportInput = {
    text: form.text,
    origin: form.origin,
    source_kind: "manual_import",
    source_reference: form.source_reference,
    captured_at: form.captured_at,
    group_key: form.group_key,
    context: {
      court: form.court,
      procedure: form.procedure,
      channel: form.channel,
      legal_date: null,
      publication_date: null,
      recipient_role: null,
      notes: null,
    },
  };
  return JSON.stringify([input]);
}

export const importFileExample = JSON.stringify(
  [
    {
      text: "Texto integral da intimação sintética.",
      origin: "synthetic",
      source_kind: "manual_import",
      source_reference: "synthetic:exemplo-1",
      captured_at: "2026-09-01T12:00:00Z",
      group_key: "synthetic:processo-1",
      context: {
        court: "synthetic:tribunal",
        procedure: "common",
        channel: "synthetic",
        legal_date: null,
        publication_date: null,
        recipient_role: null,
        notes: null,
        commercial_type: {
          schema_version: "intimation-commercial-type-v1",
          document_type: null,
          communication_kind: null,
          intimation_type: null,
          declared_deadline: null,
        },
      },
    },
  ],
  null,
  2,
);
