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

/** Legacy automatic classifications may contradict an otherwise valid declared date. */
export function tipoIncompativelComPrazo(p: PrazoDetalheView): boolean {
  return (
    !p.confirmed &&
    ["PENDING", "OPEN", "MISSED"].includes(p.status) &&
    ["ciencia", "sem_ato"].includes(p.tipo_ato ?? "")
  );
}

export function bloqueiaProvidencias(
  p: PrazoDetalheView | null,
  estado: string,
): boolean {
  if (!p) return estado === "ia" || estado === "a_classificar";
  if (p.status === "CANCELLED" || p.status === "MET") return false;
  const divergencia =
    p.origem !== "declarado" &&
    p.cross_validation?.resultado === "divergente" &&
    !p.cross_validation.decisao;
  if (divergencia) return true;
  if (p.confirmed) return false;
  return (
    precisaConfirmarPrazo(p, estado) ||
    (p.status !== "NO_DEADLINE" && p.confirmacao_exigida === true)
  );
}

export function precisaConfirmarPrazo(
  p: PrazoDetalheView,
  estado: string,
): boolean {
  if (p.confirmed || p.status === "CANCELLED" || p.status === "MET")
    return false;
  // A date divergence has its own decision form; do not bypass it with a type confirmation.
  if (
    p.origem !== "declarado" &&
    p.cross_validation?.resultado === "divergente" &&
    !p.cross_validation.decisao
  )
    return false;
  return (
    p.reopened_for_review === true ||
    tipoIncompativelComPrazo(p) ||
    (p.status !== "NO_DEADLINE" && p.confirmacao_exigida === true) ||
    estado === "a_classificar" ||
    estado === "ia"
  );
}

export { prazoVisivel } from "@/features/intimacoes/lib/prazo-visivel";
