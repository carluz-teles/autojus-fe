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

// A revisão nova escolhe somente o tipo; a elegibilidade vem do catálogo do BE.
export const definirTipoSchema = z.object({
  tipo_ato: z.string().min(1, "Escolha o tipo do ato."),
});

export type DefinirTipoForm = z.infer<typeof definirTipoSchema>;

export const revisarPrazoSchema = z.object({
  days: z.number({ error: "Informe o número de dias." }).int().min(1),
  counting: z.enum(["BUSINESS", "CALENDAR"]),
  anchor_event: z.enum(["DEADLINE_START", "PUBLISHED", "MADE_AVAILABLE"]),
  doubled: z.boolean(),
  manual_extra_days: z.number().int().min(0),
  revisado: z.boolean().refine(Boolean, "Confirme a revisão do prazo."),
});

export type RevisarPrazoForm = z.infer<typeof revisarPrazoSchema>;

/**
 * Tipo do ato ainda indeterminado — "" (nunca preenchido) ou "indeterminado"
 * (classificação pendente). Enquanto isso, o usuário precisa poder DEFINIR o tipo,
 * independente do estado do prazo (mesmo com prazo declarado/aceito).
 */
export function tipoIndeterminado(
  p: PrazoDetalheView | null,
  estado: string,
): boolean {
  const tipo = p?.tipo_ato ?? "";
  return tipo === "" || tipo === "indeterminado" || estado === "a_classificar";
}

/** Legacy automatic classifications may contradict an otherwise valid declared date. */
export function tipoIncompativelComPrazo(p: PrazoDetalheView): boolean {
  return (
    !p.confirmed &&
    ["PENDING", "OPEN", "MISSED"].includes(p.status) &&
    ["ciencia", "sem_ato"].includes(p.tipo_ato ?? "")
  );
}

// v3 (docs/erd-motor-de-prazos-v3.md §3 · erd-intimacao-triagem §10.4): o tipo é escolhido no
// GERAR-PEÇA (lazy) e a data é DEFENSÁVEL (declarada ou piso supletivo 218§3) — o detalhe NÃO
// força mais confirmação de tipo+prazo, e nada bloqueia Gerar peça / Dar ciência. A única
// revisão que sobra é a divergência declarado×calculado real, que tem form próprio (ApuracaoPrazo,
// renderizado por memoria.divergencia.pendente) e é NÃO-bloqueante. Assim estas duas viram no-op:
// mantemos as assinaturas para não churnar os call sites, mas o gate morreu.
export function bloqueiaProvidencias(
  _p: PrazoDetalheView | null,
  _estado: string,
): boolean {
  return false;
}

export function precisaConfirmarPrazo(
  _p: PrazoDetalheView,
  _estado: string,
): boolean {
  return false;
}

/** Status em que os writes de prazo (confirmar tipo/dias ou marcar sem prazo)
 *  são válidos no BE (guard comum dos endpoints: `status IN (PENDING,OPEN,…)`).
 *  Fonte única do whitelist — usada para gatear tanto o CTA de divergência
 *  (`disposicao-section.tsx`) quanto o de exceção de classificação
 *  (`PainelPrazo`), nunca reimplementada em cada lugar (Regra nº1).
 *  NO_DEADLINE fica de fora de propósito: os writes lá são idempotentes no
 *  BE, mas a UI não precisa do CTA quando já não há prazo ativo a corrigir.
 *  Terminais (MISSED/MET/CANCELLED) ficam de fora porque o BE responde 409
 *  (fora do guard). */
export function prazoAtivoParaCorrecao(
  status: PrazoDetalheView["status"],
): boolean {
  return status === "OPEN" || status === "PENDING";
}

export { prazoVisivel } from "@/features/intimacoes/lib/prazo-visivel";
