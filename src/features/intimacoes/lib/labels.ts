// Humanizações da triagem da intimação (user_status) e derivação do prazo, num
// só lugar — a lista consome daqui; nada de cálculo no JSX (Regra nº1).

import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";

import type { IntimacaoType } from "../types";
import { tipoAtoLabel } from "./tipo-ato";

/**
 * Mesmo título do read model em listas, prévia e detalhe completo. `cnjNumber`
 * é OPCIONAL e aditivo: quando informado, remove o sufixo " · <CNJ>" que o BE
 * anexa no branch réu+CNJ do título derivado (pkg/casedisplay.BuildCaseTitle —
 * sem label manual nem parte, ele cai em "classe · assunto"; com parte mas sem
 * label, cai em "<réu> · <cnj cru, 20 dígitos>"). Compara EXATAMENTE contra o
 * CNJ desta própria intimação (cru ou formatado) — nunca um regex genérico de
 * "termina em número", pra não cortar título numérico legítimo que não seja o
 * CNJ. Callers existentes (Mesa/detalhe) continuam de 1 argumento — paridade
 * preservada; só o histórico (`lib/listagem.ts`) passa o CNJ.
 */
export function tituloIntimacao(title: string, cnjNumber?: string): string {
  const semPonto = title.replace(/\s*·\s*$/, "");
  if (!cnjNumber) return semPonto;
  const cru = cnjNumber.replace(/\D/g, "");
  for (const sufixo of [cru, formatarCNJ(cnjNumber)]) {
    if (!sufixo) continue;
    const marcador = ` · ${sufixo}`;
    if (semPonto.endsWith(marcador)) {
      return semPonto.slice(0, -marcador.length).trim();
    }
  }
  return semPonto;
}

export const TYPE_LABEL: Record<IntimacaoType, string> = {
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  COMUNICACAO: "Comunicação",
};

/** Rótulo visual do ato desta publicação, separado do trabalho exigido pelo prazo. */
export function atoPublicacaoLabel(
  aiAct: string | null | undefined,
  prazoTipoAto: string | null | undefined,
  type: IntimacaoType,
): string {
  return (
    aiAct?.trim() ||
    (prazoTipoAto ? tipoAtoLabel(prazoTipoAto) : "") ||
    TYPE_LABEL[type] ||
    "Intimação"
  );
}
