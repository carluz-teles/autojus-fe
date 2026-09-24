// Deriva a DISPOSIÇÃO da intimação (a "unidade de trabalho") a partir dos
// action_items dela (ai_providencias). A pergunta que a UI faz é: esta intimação
// precisa de TRABALHO, é só CIÊNCIA, ou ainda não dá pra afirmar (INDETERMINADO)?
//
// TRÊS disposições — nunca duas. A pergunta que decide bucket é SEMPRE "o
// `tipo` é um dos válidos de obrigação (cumprir/manifestar/contestar/
// recorrer)?" PRIMEIRO; só dentro dessa resposta é que `gera_peca` decide COMO
// o trabalho se cumpre. `gera_peca=true` NUNCA prova sozinho que um item é
// obrigação — um `tipo` inválido/contraditório com `gera_peca=true` continua
// indeterminado, não vira "trabalho" por acidente:
//
//   · "trabalho"      → tipo ∈ {cumprir,manifestar,contestar,recorrer}: com
//     `gera_peca=true` vira peça formal; com `gera_peca=false` vira obrigação
//     de fluxo curto (CTA "Gerar peça" continua disponível).
//   · "ciencia"       → SOMENTE quando TODOS os itens são `tipo==='ciencia' &&
//     gera_peca=false` (ciência real, não contraditória) — nunca por omissão,
//     nunca em dado misto.
//   · "indeterminado" → lista vazia, OU existe item com `tipo` fora do enum de
//     trabalho válido — inclui tipo desconhecido/vazio/drift de API E o
//     contraditório `tipo==='ciencia' && gera_peca=true` (gera_peca=true não
//     basta para inventar uma obrigação sobre um tipo que não é de trabalho).
//     NÃO se inventa `cumprir` nem "apenas ciência" aqui — o item ainda carrega
//     `title`/`description` como dado disponível (renderiza, não esconde), só
//     não se afirma que tipo de obrigação é. Precedência: um item indeterminado
//     misturado com um item de ciência real NUNCA reduz a disposição a
//     "ciencia" (dado incerto não pode ser mascarado por dado certo ao lado).
//
// Função PURA (sem rótulos/UI) — os rótulos vivem no hook/componente (client),
// que resolve piece_profile_key → label via PIECE_PROFILES/WORK_TYPES.

import type { ProvidenciaFulfillment } from "@/features/action-items/types";
import type {
  IntimacaoProvidencia,
  IntimacaoProvidenciaStatus,
  ProvidenciaTipo,
} from "@/features/intimacoes/types";

/** Um action_item não-ciência desta intimação — pode ou não gerar peça formal
 *  (`geraPeca`) e pode ou não ter `tipo` reconhecido como obrigação válida
 *  (ver bucket `indeterminados` em `Disposicao`). */
export interface DisposicaoObrigacao {
  /** id do action_item — base do atalho "Gerar peça" (auto-partida). */
  actionItemId: string;
  tipo: ProvidenciaTipo;
  /** Título rico da providência; null em itens antigos/degradados. */
  title: string | null;
  description: string | null;
  /** true = essa obrigação também é uma PEÇA formal a produzir. */
  geraPeca: boolean;
  /** Perfil de peça do catálogo (null quando não classificado ou sem peça). */
  pieceProfileKey: string | null;
  status: IntimacaoProvidenciaStatus;
  /** WORKING/DONE ⇒ o trabalho provavelmente já foi iniciado. */
  jaIniciada: boolean;
  /** Fulfillment já tipado/persistido do action_item (mesmo JSON do BE, sem
   *  campo novo/duplicado) — `obligation_quote` é a evidência do DEVER (extraída
   *  do teor, neutra); `evidence`/`status` são o alerta de POSSÍVEL cumprimento
   *  nos autos (eixo diferente). null/ausente quando o item não tem fulfillment
   *  computado (comportamento legado, sem quote). */
  fulfillment: ProvidenciaFulfillment | null;
}

/** Alias — mantido para callers que só se importam com obrigações que geram
 *  peça formal (mesmo shape de `DisposicaoObrigacao`). */
export type DisposicaoPeca = DisposicaoObrigacao;

/** O item de CIÊNCIA REAL (tipo==='ciencia' e não contraditório) desta
 *  intimação, quando existe. Carrega `title`/`description` para que a UI
 *  possa exibir o CONTEÚDO IDENTIFICADO mesmo quando a disposição do prazo
 *  (motor) diverge — nunca suprimir o que já foi identificado. */
export interface DisposicaoCiencia {
  actionItemId: string;
  title: string | null;
  description: string | null;
  status: IntimacaoProvidenciaStatus;
  concluida: boolean;
}

export type DisposicaoTipo = "trabalho" | "indeterminado" | "ciencia";

export interface Disposicao {
  tipo: DisposicaoTipo;
  /** Obrigações de tipo válido que também são peças formais (`geraPeca=true`).
   *  NÃO EXCLUSIVO de `oportunidades`: um item `tipo='recorrer'` continua aqui
   *  (fonte única do índice "meio" que `intimacao-detalhe.tsx` usa para o alvo
   *  de "Gerar peça" — `pecas[0] ?? obrigacoes[0] ?? indeterminados[0]` — não
   *  reparticionar isso sem coordenar quem consome). */
  pecas: DisposicaoObrigacao[];
  /** Obrigações de tipo válido (cumprir/manifestar/contestar/recorrer) sem
   *  peça. Mesma nota de não-exclusividade de `pecas` acima. */
  obrigacoes: DisposicaoObrigacao[];
  /** Oportunidades — `tipo==='recorrer'` (direito/faculdade; PM: "Recurso/
   *  apelação = Oportunidade", nunca "dever de recorrer"). É um RECORTE
   *  aditivo/não-exclusivo sobre `pecas`∪`obrigacoes` (mesmos itens, mesma
   *  identidade) — existe pra a UI agrupar/rotular como classe distinta de
   *  "Trabalho", sem tirar os itens do índice `pecas`/`obrigacoes` que outros
   *  callers (Gerar peça) já dependem. Nunca cai em `ciencia`/`indeterminados`. */
  oportunidades: DisposicaoObrigacao[];
  /** Itens com `tipo` fora do enum de trabalho válido (desconhecido/vazio/
   *  drift, ou o contraditório ciência+gera_peca=true) — dado disponível
   *  (title/description), sem afirmar que obrigação é. Rótulo de UI: "A
   *  identificar" (nunca ciência por ausência/incerteza). */
  indeterminados: DisposicaoObrigacao[];
  /** Item de ciência para concluir; null quando a disposição não é ciência ou
   *  é ciência sem item materializado (resolve-se a própria intimação). */
  ciencia: DisposicaoCiencia | null;
  /** Cabeçalho: "Trabalho a cumprir" | "Trabalho a identificar" | "Ciência". */
  headline: string;
  /** true quando ainda não há action_items (intimação não analisada). */
  vazia: boolean;
}

/** Tipos reconhecidos como obrigação de trabalho (fora de ciência). */
const TIPOS_TRABALHO_VALIDOS: ReadonlySet<ProvidenciaTipo> = new Set([
  "cumprir",
  "manifestar",
  "contestar",
  "recorrer",
]);

/** Ciência REAL: tipo declarado como ciência e sem contradição com gera_peca
 *  (gera_peca=true nesse tipo é sinal de trabalho, não de "apenas ciência"). */
function isCienciaReal(p: IntimacaoProvidencia): boolean {
  return p.tipo === "ciencia" && !p.gera_peca;
}

function toObrigacao(p: IntimacaoProvidencia): DisposicaoObrigacao {
  return {
    actionItemId: p.id,
    tipo: p.tipo,
    title: p.title,
    description: p.description,
    geraPeca: p.gera_peca,
    pieceProfileKey: p.piece_profile_key,
    status: p.status,
    jaIniciada: p.status === "WORKING" || p.status === "DONE",
    fulfillment: p.fulfillment ?? null,
  };
}

export function derivarDisposicao(
  providencias: IntimacaoProvidencia[],
): Disposicao {
  const cienciaItem = providencias.find((p) => isCienciaReal(p)) ?? null;
  const ciencia: DisposicaoCiencia | null = cienciaItem
    ? {
        actionItemId: cienciaItem.id,
        title: cienciaItem.title,
        description: cienciaItem.description,
        status: cienciaItem.status,
        concluida: cienciaItem.status === "DONE",
      }
    : null;

  // Candidatos a trabalho = tudo que não é ciência real. Partição exaustiva e
  // disjunta pelas duas perguntas, NESTA ORDEM: (1) o tipo é um dos válidos de
  // obrigação? (2) só se sim, gera peça? Um tipo inválido nunca vira obrigação
  // só porque `gera_peca=true` — cai em indeterminados de qualquer forma.
  const candidatos = providencias.filter((p) => !isCienciaReal(p));
  const validos = candidatos.filter((p) => TIPOS_TRABALHO_VALIDOS.has(p.tipo));
  const pecas = validos.filter((p) => p.gera_peca).map(toObrigacao);
  const obrigacoes = validos.filter((p) => !p.gera_peca).map(toObrigacao);
  // Recorte aditivo (não remove de pecas/obrigacoes — ver doc de Disposicao):
  // toda oportunidade (recorrer) já está em pecas OU obrigacoes; aqui é só a
  // MESMA identidade filtrada pra a UI tratar como classe distinta ("direito",
  // nunca "dever"). NUNCA cai em indeterminados/ciencia — recorrer é sempre um
  // tipo válido de trabalho (TIPOS_TRABALHO_VALIDOS).
  const oportunidades = [...pecas, ...obrigacoes].filter(
    (o) => o.tipo === "recorrer",
  );
  const indeterminados = candidatos
    .filter((p) => !TIPOS_TRABALHO_VALIDOS.has(p.tipo))
    .map(toObrigacao);

  let tipo: DisposicaoTipo;
  let headline: string;
  if (pecas.length > 0 || obrigacoes.length > 0) {
    // `tipo` PERMANECE "trabalho" aqui sem exceção — canonical, consumido pelo
    // alvo do CTA "Gerar peça" (pecas[0]??obrigacoes[0]??indeterminados[0] em
    // intimacao-detalhe.tsx) e por outros callers; NÃO reparticionar por causa
    // do headline. Só o TEXTO do headline muda conforme existe ou não uma
    // obrigação REAL (não-oportunidade) na mistura — oportunidade sozinha
    // nunca é "a cumprir" (não é dever).
    tipo = "trabalho";
    const temObrigacaoReal = [...pecas, ...obrigacoes].some(
      (o) => o.tipo !== "recorrer",
    );
    if (temObrigacaoReal) {
      headline = "Trabalho a cumprir";
    } else if (indeterminados.length > 0) {
      // Só oportunidade + item(ns) ainda não identificado(s): o headline
      // reflete o que falta identificar (a oportunidade tem caixa própria,
      // rotulada à parte, mostrada além desta).
      headline = "Trabalho a identificar";
    } else {
      // Só oportunidade, nada mais a cumprir/identificar — nunca "a cumprir".
      headline = "Oportunidade identificada";
    }
  } else if (indeterminados.length > 0 || providencias.length === 0) {
    tipo = "indeterminado";
    headline = "Trabalho a identificar";
  } else {
    tipo = "ciencia";
    headline = "Ciência";
  }

  return {
    tipo,
    pecas,
    obrigacoes,
    oportunidades,
    indeterminados,
    ciencia,
    headline,
    vazia: providencias.length === 0,
  };
}
