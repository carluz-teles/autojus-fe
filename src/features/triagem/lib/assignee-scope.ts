/**
 * Eixo de responsável da Mesa de Trabalho ("Minha visão" — docs/revamp-mesa-
 * trabalho-intimacoes.md §8). Traduz a seleção do usuário em EXATAMENTE UM dos
 * dois parâmetros de wire que o BE aceita — nunca os dois juntos, o BE rejeita
 * a combinação com 400 (assignee_scope XOR assignee).
 */
export type AssigneeScope = "mine" | "unassigned" | "mine_or_unassigned";

export interface AssigneeWireFilter {
  assignee?: string;
  assigneeScope?: AssigneeScope;
}

/**
 * `respFilter` vem do seletor "Minha visão": "minha_visao" (default) mapeia
 * para o escopo combinado; "mine"/"unassigned" mapeiam 1:1 para o escopo
 * correspondente; "todos" (Todo o escritório, conforme permissões) e ""
 * (ausente) não usam filtro algum; um id de colega específico vai como
 * `assignee` explícito. "todos" é um sentinela NÃO-vazio de propósito — o
 * valor de wire "" colidiria com "ausente" no helper de URL (useUrlFilters
 * remove a chave quando o valor é uma string vazia).
 */
export function resolverAssigneeScope(respFilter: string): AssigneeWireFilter {
  if (respFilter === "minha_visao")
    return { assigneeScope: "mine_or_unassigned" };
  if (respFilter === "mine" || respFilter === "unassigned")
    return { assigneeScope: respFilter };
  if (respFilter === "" || respFilter === "todos") return {};
  return { assignee: respFilter };
}
