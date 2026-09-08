import { z } from "zod";

import { TIPO_ATO_LABEL } from "@/features/intimacoes/lib/tipo-ato";

import type { PrazoDetalheView } from "../types";

export const TIPOS_COM_PRAZO = Object.entries(TIPO_ATO_LABEL).filter(
  ([tipo]) => !["ciencia", "sem_ato", "indeterminado"].includes(tipo),
);

export const confirmacaoSchema = z.object({
  tipo_ato: z
    .string()
    .refine(
      (value) => TIPOS_COM_PRAZO.some(([tipo]) => tipo === value),
      "Escolha o tipo do ato.",
    ),
  days: z
    .number({ error: "Informe o número de dias." })
    .int()
    .min(1, "Informe ao menos 1 dia."),
  counting: z.enum(["BUSINESS", "CALENDAR"]),
  anchor_event: z.enum(["DEADLINE_START", "PUBLISHED", "MADE_AVAILABLE"]),
  doubled: z.boolean(),
  manual_extra_days: z.number().int().min(0),
  revisado: z
    .boolean()
    .refine((value) => value, "Confirme a revisão do tipo e do prazo."),
});

export type ConfirmacaoForm = z.infer<typeof confirmacaoSchema>;

export function precisaConfirmarPrazo(
  p: PrazoDetalheView,
  estado: string,
): boolean {
  if (p.confirmed || p.status === "CANCELLED" || p.status === "MET")
    return false;
  // confirmacao_exigida also signals date divergence or tenant policy. Those
  // requirements do not turn a declared/calculated prazo into an inferred type.
  return (
    p.reopened_for_review === true ||
    estado === "a_classificar" ||
    estado === "ia"
  );
}

export { prazoVisivel } from "@/features/intimacoes/lib/prazo-visivel";
