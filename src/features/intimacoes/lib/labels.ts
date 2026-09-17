// Humanizações da triagem da intimação (user_status) e derivação do prazo, num
// só lugar — a lista consome daqui; nada de cálculo no JSX (Regra nº1).

import type { IntimacaoType } from "../types";

export const TYPE_LABEL: Record<IntimacaoType, string> = {
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  COMUNICACAO: "Comunicação",
};
