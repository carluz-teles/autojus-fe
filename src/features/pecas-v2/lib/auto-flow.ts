// Decisões PURAS do fluxo de construção (construction-page + use-construction).
//
// Correção (usuário/root): o fluxo intermediário de teses (PreparationCanvas/
// TesesRail pré-geração) foi ABOLIDO — inclusive como "recuperação manual".
// Antes, a decisão de tela dependia de `auto=1` estar na URL (`isAutoFlow`):
// sem esse parâmetro, QUALQUER entrada num rascunho ainda não gerado (reabrir
// da lista de Peças do processo, `href` sem `?auto=1` — `use-processo-hub.ts`;
// falha de saga detectada via polling, não pela própria mutação da sessão;
// refresh) caía no wizard manual de seleção de teses. Bug real, não hipotético.
//
// SEGUNDA correção (root, rodada 3): o "Tentar de novo" (`retryAuto`) só
// resetava flags locais (`autoFired=false`, `autoFailed=false`) e TORCIA pro
// efeito de auto-disparo religar sozinho — que exige `saga==='CREATED'`. Numa
// falha REAL (`saga==='FAILED'` vindo do BE), isso é NO-OP silencioso: o saga
// não vira CREATED só porque o FE resetou uma flag. Retry agora CHAMA a
// mutation canônica direto (mesma usada pelo disparo automático), nunca
// "finge" um saga que o BE não confirmou. Também corrigido: uma lista de
// teses que assenta genuinamente VAZIA (sem erro, sem streaming, sem
// regenerar) travava o loader para sempre (`theses.theses.length===0` só
// fazia `return`, sem nunca marcar falha) — agora vira falha real, observável
// e recuperável, não um loader infinito.
//
// Regra nova, ÚNICA fonte, sem depender de nenhum parâmetro de URL: a tela é
// função só do ESTADO REAL do rascunho (origem, teor, stage, autoFailed) —
// nunca de como o usuário chegou lá. Um rascunho sem conteúdo (`pregen` ou
// `falha` sem `contentHtml`) é SEMPRE "carregando" (o loader de 4 fases,
// disparando a geração em segundo plano) ou "falha" (erro limpo + retry) —
// nunca o wizard.

import type { CenterStage } from "../hooks/use-construction";

export type ConstructionScreen =
  "sem-origem" | "sem-teor" | "falha" | "carregando" | "pronta";

/** Deriva qual tela mostrar. Ordem importa (gates reais primeiro, sempre —
 *  nunca pulados nem contornados):
 *  1. Sem intimação de origem → bloqueio estrutural (link para /intimacoes).
 *  2. Sem teor → bloqueio estrutural (link para a intimação de origem);
 *     idêntico em espírito ao gate de autos do `PecaGateModal` (pre-flight):
 *     não se gera minuta sem o dado mínimo, mas isso NUNCA vira um wizard de
 *     seleção manual — é uma mensagem de bloqueio com um caminho de volta.
 *  3. Falha (flag local da sessão OU saga_state==='FAILED' vindo de polling
 *     — cobre a falha assíncrona pós-202/SSE que a sessão atual não disparou)
 *     E ainda sem conteúdo → tela de erro limpa + "Tentar de novo" (retryAuto,
 *     reusa o MESMO draftId — nunca cria peça duplicada). Ver
 *     As instructions continuam guardadas até a peça ficar pronta.
 *  4. Já tem conteúdo pronto (stage 'pronta', ou 'falha' preservando conteúdo
 *     de uma REGERAÇÃO que falhou) → workbench.
 *  5. Qualquer outra coisa (`pregen` sem conteúdo, `gerando`) → "carregando":
 *     o loader de 4 fases, com a geração disparando sozinha em segundo plano
 *     assim que os gates acima permitirem — nunca uma tela de escolha manual. */
export function derivarTelaConstrucao(params: {
  hasOrigin: boolean;
  hasTeor: boolean;
  stage: CenterStage;
  hasContent: boolean;
  autoFailed: boolean;
}): ConstructionScreen {
  if (!params.hasOrigin) return "sem-origem";
  if (!params.hasTeor) return "sem-teor";
  // `stage==='falha'` já reflete `saga_state==='FAILED'` (deriveStage) —
  // checado aqui DIRETO, não só via `autoFailed` (que o hook já pré-dobra,
  // mas esta função pura fica correta por si, sem depender de o caller
  // lembrar de fazer esse fold — defesa em profundidade).
  if ((params.autoFailed || params.stage === "falha") && !params.hasContent)
    return "falha";
  if (
    params.stage === "pronta" ||
    (params.stage === "falha" && params.hasContent)
  )
    return "pronta";
  return "carregando";
}

/** Estado (mínimo) das teses que as decisões abaixo precisam — mesmo shape do
 *  retorno de `ThesesController`, só os campos usados. */
export interface TesesEstado {
  theses: { id: string }[];
  isLoading: boolean;
  isError: boolean;
  isRegenerating: boolean;
  isTogglingId: string | null;
}

export type AcaoAuto =
  | { tipo: "esperar" }
  | { tipo: "gerar"; thesisIds: string[] }
  | { tipo: "falhar" };

/** Decide a PRÓXIMA AÇÃO do disparo automático (o `useEffect` de
 *  `use-construction` é um dispatcher fino sobre isto — a decisão em si é
 *  pura e testável sem montar o hook/efeitos reais).
 *  `settled`: o stream (ou o fallback síncrono) já concluiu pelo menos uma
 *  tentativa — sem isto, uma lista vazia por estar simplesmente "ainda não
 *  chegou" (1ª renderização, antes do SSE conectar) seria confundida com
 *  "settled vazia = sem fundamento algum" e falharia cedo demais. */
export function decidirAcaoAuto(params: {
  hasOrigin: boolean;
  hasTeor: boolean;
  saga: string | undefined;
  hasContent: boolean;
  firedGenerate: boolean;
  theses: TesesEstado;
  settled: boolean;
}): AcaoAuto {
  if (!params.hasOrigin || !params.hasTeor) return { tipo: "esperar" };
  if (params.saga !== "CREATED" || params.hasContent || params.firedGenerate)
    return { tipo: "esperar" };
  if (params.theses.isError) return { tipo: "falhar" };
  if (
    params.theses.isLoading ||
    params.theses.isRegenerating ||
    params.theses.isTogglingId
  )
    return { tipo: "esperar" };
  if (params.theses.theses.length === 0) {
    // Settled (stream/fallback concluíram) e AINDA vazia = nenhum fundamento
    // encontrado — falha real e observável, nunca um loader que nunca sai
    // dessa espera (o bug relatado pelo root).
    return params.settled ? { tipo: "falhar" } : { tipo: "esperar" };
  }
  return { tipo: "gerar", thesisIds: params.theses.theses.map((t) => t.id) };
}

export type AcaoRetry = { tipo: "regerar-teses" } | { tipo: "gerar" };

/** Decide a ação do RETRY explícito ("Tentar de novo"). NUNCA reseta flags
 *  esperando o efeito de auto-disparo religar sozinho — ele exige
 *  `saga==='CREATED'`, que pode já não ser verdade após uma falha real
 *  (`saga==='FAILED'` confirmado pelo BE não vira CREATED só porque o FE
 *  resetou uma flag local; seria "fingir" um saga que o BE não confirmou).
 *  Em vez disso, chama a mutation canônica DIRETO:
 *   - teses com erro OU genuinamente vazias → `regerar-teses` (POST /theses
 *     síncrono, o mesmo caminho do botão "Atualizar fundamentos"); depois a
 *     sequência explícita do retry chama a geração no mesmo draft.
 *   - teses OK (já populadas, sem erro) → `gerar` direto, reusando a lista
 *     JÁ existente — não gasta uma chamada extra pra re-obter fundamentos que
 *     já estão certos; o problema foi a geração em si (assessment/generate),
 *     não a etapa de teses. */
export function decidirAcaoRetry(params: {
  theses: Pick<TesesEstado, "theses" | "isError">;
}): AcaoRetry {
  if (params.theses.isError || params.theses.theses.length === 0)
    return { tipo: "regerar-teses" };
  return { tipo: "gerar" };
}
