/**
 * Modo do detalhe da intimação (docs/revamp-mesa-trabalho-intimacoes.md §4,
 * tabela do Detalhe): "execucao" (Mesa de Trabalho) mostra as ações reais;
 * "consulta" (histórico de Intimações) mostra só "Abrir na Mesa" — consultar
 * NÃO executa trabalho. No painel contextual, quem embute decide o modo
 * explicitamente. No modo página (deep-link direto), infere-se do retorno.
 */
export type ModoDetalhe = "execucao" | "consulta";

export function resolverModoDetalhe(
  painelModo: ModoDetalhe | undefined,
  retorno: string,
): ModoDetalhe {
  if (painelModo) return painelModo;
  return retorno.startsWith("/triagem") ? "execucao" : "consulta";
}
