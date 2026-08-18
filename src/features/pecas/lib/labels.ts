import type { PecaOrigem, PecaStatus } from "@/features/pecas/types";

// Rótulos de domínio das peças — mesmo padrão de intimacoes/lib/labels e prazos/
// lib. Um só lugar traduz os enums do BE para o texto da UI.

/** Rótulo humano do status (espelha os valores reais do BE: DRAFT|REVIEWED|SIGNED). */
export const STATUS_LABEL: Record<PecaStatus, string> = {
  DRAFT: "Rascunho",
  REVIEWED: "Revisada",
  SIGNED: "Assinada",
};

/** Rótulo humano da origem da peça (stubs de lista — fatia futura). */
export const ORIGEM_LABEL: Record<PecaOrigem, string> = {
  IA: "Gerada com IA",
  MODELO: "De um modelo",
  BRANCO: "Em branco",
  INTIMACAO: "A partir de intimação",
};
