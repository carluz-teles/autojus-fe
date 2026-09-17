// Deriva a DISPOSIÇÃO da intimação (a "unidade de trabalho") a partir dos
// action_items dela (ai_providencias). A pergunta que a UI faz é: esta intimação
// precisa de TRABALHO ou só de CIÊNCIA? Se precisa, quantas peças?
//
//   · Nº de PEÇAS  = itens com gera_peca=true (cada um vira "Gerar peça — <label>").
//   · Sem gera_peca=true → "Apenas ciência" (concluir o item de ciência resolve a
//     intimação; quando não há item, o caminho equivalente é resolver a intimação).
//
// Função PURA (sem rótulos/UI) — os rótulos de peça vivem no hook/componente
// (client), que resolve piece_profile_key → label via PIECE_PROFILES.

import type {
  IntimacaoProvidencia,
  IntimacaoProvidenciaStatus,
  ProvidenciaTipo,
} from "@/features/intimacoes/types";

/** Uma PEÇA a produzir (action_item com gera_peca=true). */
export interface DisposicaoPeca {
  /** id do action_item — base do atalho "Gerar peça" (auto-partida). */
  actionItemId: string;
  tipo: ProvidenciaTipo;
  /** Perfil de peça do catálogo (null quando não classificado). */
  pieceProfileKey: string | null;
  status: IntimacaoProvidenciaStatus;
  /** WORKING/DONE ⇒ a peça provavelmente já existe (abrir em vez de gerar). */
  jaIniciada: boolean;
}

/** O item de CIÊNCIA (gera_peca=false) desta intimação, quando existe. */
interface DisposicaoCiencia {
  actionItemId: string;
  status: IntimacaoProvidenciaStatus;
  concluida: boolean;
}

export interface Disposicao {
  /** "trabalho" quando há ≥1 peça a produzir; "ciencia" caso contrário. */
  tipo: "trabalho" | "ciencia";
  pecas: DisposicaoPeca[];
  /** Item de ciência para concluir; null quando a disposição é ciência sem item
   *  materializado (resolve-se a própria intimação). */
  ciencia: DisposicaoCiencia | null;
  /** Cabeçalho: "Apenas ciência" ou "Precisa de trabalho — N peça(s)". */
  headline: string;
  /** true quando ainda não há action_items (intimação não analisada). */
  vazia: boolean;
}

export function derivarDisposicao(
  providencias: IntimacaoProvidencia[],
): Disposicao {
  const pecas = providencias.filter((p) => p.gera_peca);
  const cienciaItem = providencias.find((p) => !p.gera_peca) ?? null;
  const ciencia: DisposicaoCiencia | null = cienciaItem
    ? {
        actionItemId: cienciaItem.id,
        status: cienciaItem.status,
        concluida: cienciaItem.status === "DONE",
      }
    : null;

  if (pecas.length > 0) {
    return {
      tipo: "trabalho",
      pecas: pecas.map((p) => ({
        actionItemId: p.id,
        tipo: p.tipo,
        pieceProfileKey: p.piece_profile_key,
        status: p.status,
        jaIniciada: p.status === "WORKING" || p.status === "DONE",
      })),
      ciencia,
      headline: `Precisa de trabalho — ${pecas.length} ${
        pecas.length === 1 ? "peça" : "peças"
      }`,
      vazia: false,
    };
  }

  return {
    tipo: "ciencia",
    pecas: [],
    ciencia,
    headline: "Apenas ciência",
    vazia: providencias.length === 0,
  };
}
