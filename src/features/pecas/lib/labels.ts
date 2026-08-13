import type { PecaOrigem, PecaStatus } from "@/features/pecas/types";

// Rótulos de domínio das peças — mesmo padrão de intimacoes/lib/labels e prazos/
// lib. Um só lugar traduz os enums do BE para o texto da UI. O tom de cor de cada
// status vive em `pecaTone` (components/ui/status-badge), não aqui.

/** Rótulo humano do status (o `pecaTone` mapeia estes mesmos rótulos → cor). */
export const STATUS_LABEL: Record<PecaStatus, string> = {
  RASCUNHO: "Rascunho",
  EM_PRODUCAO: "Em produção",
  EM_REVISAO: "Em revisão",
  PROTOCOLADA: "Protocolada",
  ARQUIVADA: "Arquivada",
};

/** Rótulo humano da origem da peça. */
export const ORIGEM_LABEL: Record<PecaOrigem, string> = {
  IA: "Gerada com IA",
  MODELO: "De um modelo",
  BRANCO: "Em branco",
  INTIMACAO: "A partir de intimação",
};
