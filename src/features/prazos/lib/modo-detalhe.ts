/**
 * Modo do detalhe da intimação: "execucao" (Mesa de Trabalho) e "consulta"
 * (histórico de Intimações). No painel contextual, quem embute decide o modo
 * explicitamente. No modo página (deep-link direto), infere-se do retorno.
 */
export type ModoDetalhe = "execucao" | "consulta";

/**
 * O que o modo muda no detalhe — FONTE ÚNICA da política.
 *
 * Decisão do produto: as duas telas mostram os MESMOS dados e permitem as
 * MESMAS ações para a MESMA intimação. O modo "consulta" apenas GANHA o atalho
 * "Abrir na Mesa"; ele não subtrai nada. Antes, `consulta` descartava a barra de
 * ações inteira (Gerar peça · Dar ciência · Revisar tipo/prazo · trocar
 * responsável), então `/intimacoes/<id>` e a Mesa divergiam para o mesmo item —
 * o advogado achava a intimação e não podia agir sobre ela.
 *
 * ATENÇÃO — `docs/revamp-mesa-trabalho-intimacoes.md` §4 ("Intimações —
 * desktop") diz "Sem checkboxes nem barra de ações operacionais" e lista só
 * "[Abrir na Mesa]" no detalhe do histórico, o que CONTRADIZ esta política. O
 * §6 (critério 2) pede consistência de dados entre as duas telas, não de ações.
 * A contradição está registrada para o doc ser reconciliado; o que NÃO voltou
 * (e segue conforme o §4) é a seleção em LOTE: nada de checkbox nem barra de
 * ações de lote no histórico — as ações são por item, no detalhe.
 */
export function capacidadesDoModo(modo: ModoDetalhe) {
  return {
    /** Atalho para o mesmo id na Mesa — só o histórico precisa dele. */
    abrirNaMesa: modo === "consulta",
    /** Ações de execução por item. Ligadas nos DOIS modos, de propósito. */
    executar: true,
  };
}

export function resolverModoDetalhe(
  painelModo: ModoDetalhe | undefined,
  retorno: string,
): ModoDetalhe {
  if (painelModo) return painelModo;
  return retorno.startsWith("/triagem") ? "execucao" : "consulta";
}
