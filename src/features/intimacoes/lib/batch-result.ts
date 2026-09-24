import type { BatchIdsResult } from "../services/intimacoes.service";

/**
 * Resumo de um lote disparado por-id (sem endpoint em lote no BE — Dar ciência
 * e Atribuir responsável fazem fan-out de chamadas individuais). Erro parcial
 * é recuperável (docs/revamp-mesa-trabalho-intimacoes.md AC7): os IDs que
 * sucederam saem da seleção; os que falharam PERMANECEM selecionados para
 * nova tentativa — nunca um "tudo ou nada" client-side sobre um lote que, no
 * servidor, foi item-a-item.
 */
export interface ResumoLote {
  mensagens: { tom: "success" | "error"; texto: string }[];
}

export function resumoLote(
  result: BatchIdsResult,
  labels: { singular: string; plural: string },
): ResumoLote {
  const mensagens: ResumoLote["mensagens"] = [];
  if (result.succeeded.length > 0) {
    const n = result.succeeded.length;
    mensagens.push({
      tom: "success",
      texto: `${n.toLocaleString("pt-BR")} ${n === 1 ? labels.singular : labels.plural}.`,
    });
  }
  if (result.failed.length > 0) {
    const n = result.failed.length;
    mensagens.push({
      tom: "error",
      texto: `${n.toLocaleString("pt-BR")} ${n === 1 ? "item" : "itens"} — falha; ${n === 1 ? "permanece selecionado" : "permanecem selecionados"} para nova tentativa.`,
    });
  }
  return { mensagens };
}
