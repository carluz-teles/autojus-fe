"use client";

// UNIDADE DE TRABALHO da intimação — sem o conceito de "providência". Responde em
// texto "O QUE ACONTECEU" (o ato, ex.: "Sentença") + o estado da disposição
// (`disposicao.headline`: "Trabalho a cumprir"/"Trabalho a identificar"/
// "Ciência" — computado em `derivarDisposicao`, não hard-coded aqui). Os DOIS
// botões primários (Gerar peça · Dar ciência) NÃO
// vivem mais aqui: subiram para o topo do detalhe, ao lado do ⋮ (ver AcoesPrimarias
// em intimacao-detalhe.tsx), sem gate. Aqui fica só o conteúdo + o botão "Analisar
// intimação" (materializa o que aconteceu). O action_item por baixo é só encanamento
// — nunca aparece como "providência".

import { Dialog } from "@base-ui/react/dialog";
import {
  AlertTriangle,
  Check,
  FileText,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProvidenciaFulfillment } from "@/features/action-items/components/providencia-fulfillment";
import { hasActionableFulfillment } from "@/features/action-items/lib/fulfillment";
import type { ProvidenciaFulfillment as ProvidenciaFulfillmentType } from "@/features/action-items/types";
import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";
import type {
  IntimacaoAcionabilidade,
  IntimacaoDisposicao,
  IntimacaoProvidencia,
  IntimacaoView,
} from "@/features/intimacoes/types";
import { cn, formatarData } from "@/lib/utils";

import { ANALYSIS_PROCESSING_MESSAGE } from "../../../intimacoes/lib/analysis-materialization";
import { useDisposicao } from "../../hooks/use-disposicao";
import { prazoAtivoParaCorrecao } from "../../lib/confirmacao";
import type { PrazoDetalheView } from "../../types";
import { DefinirTipoAto } from "./definir-tipo-ato";

/** Rótulo pt-BR de `acionabilidade` (Sinal A do motor v3 — "o que a intimação
 *  exige", `types.ts:72-74`) — o DADO que de fato explica a divergência
 *  ("ato" exige cumprimento × item identificado é ciência). Eixo DIFERENTE de
 *  `tipo_ato` ("o que TIPO de ato" — indeterminado/a_classificar/etc.):
 *  um não substitui o outro, por isso os dois aparecem, em hierarquia clara
 *  (acionabilidade primeiro — é o sinal que gera o agreement_state). */
const ACIONABILIDADE_LABEL: Record<IntimacaoAcionabilidade, string> = {
  ato: "Exige cumprimento",
  ciencia: "Apenas ciência",
  a_classificar: "A classificar",
  "": "A classificar",
};

/** Uma linha de "trabalho necessário" — peça, obrigação ou item indeterminado.
 *  `label` já vem resolvido pelo hook (title → perfil/tipo → rótulo neutro);
 *  `description` é o dado bruto do action_item, nunca inventado aqui.
 *
 *  `fulfillment` (mesmo JSON já tipado/persistido do action_item, sem campo
 *  novo) alimenta DUAS exibições DISTINTAS e independentes:
 *   1. `obligation_quote` — evidência do DEVER, extraída do teor pelo
 *      determinístico/IA — sempre que existir, neutra, SEM alegar "autos
 *      analisados" (é o trecho do que foi PEDIDO, não uma verificação de
 *      cumprimento).
 *   2. `<ProvidenciaFulfillment showObligationQuote={false}>` (reuso do
 *      componente já existente em action-items, com o novo opt-out — ver
 *      REUSE CHECK do handoff) — o alerta de POSSÍVEL CUMPRIMENTO nos autos,
 *      que só aparece sob `hasActionableFulfillment` (evidência de autos
 *      válida e atual). `showObligationQuote={false}` evita duplicar a mesma
 *      citação quando as duas exibições coincidem; o default `true` do
 *      componente preserva qualquer OUTRO caller que não passe a prop.
 *
 *  Selo de desatualização: quando `fulfillment.invalidated` ou
 *  `fulfillment.sources.stale`, o trecho pode se referir a uma revisão de
 *  teor/autos que já mudou — mostramos o quote (nunca escondido: é
 *  informação real, só potencialmente antiga) mas com rótulo "análise
 *  desatualizada" em vez de apresentá-lo como vigente sem esse sinal. */
function ItemTrabalho({
  label,
  description,
  fulfillment = null,
}: {
  label: string;
  description: string | null;
  fulfillment?: ProvidenciaFulfillmentType | null;
}) {
  const quoteDesatualizado =
    !!fulfillment?.invalidated || !!fulfillment?.sources?.stale;
  return (
    <div className="flex items-start gap-3">
      <span
        className="text-primary-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), black 14%))",
        }}
      >
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm leading-relaxed font-medium break-words">
          {label}
        </p>
        {description ? (
          <p className="text-muted-foreground text-sm leading-relaxed break-words">
            {description}
          </p>
        ) : null}
        {fulfillment?.obligation_quote ? (
          <blockquote className="border-line text-muted-foreground mt-2 border-l-2 pl-3 text-sm whitespace-pre-wrap">
            <span className="text-fg3 block text-xs">
              {quoteDesatualizado
                ? "Trecho identificado — análise desatualizada"
                : "Trecho identificado no teor"}
            </span>
            {fulfillment.obligation_quote}
          </blockquote>
        ) : null}
        {hasActionableFulfillment(fulfillment) ? (
          <div className="mt-2">
            <ProvidenciaFulfillment
              fulfillment={fulfillment}
              showObligationQuote={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DisposicaoSection({
  intimationId,
  providencias,
  analyzed,
  analyzing,
  analysisError,
  analysisProcessingTimeout = false,
  onAnalyze,
  reviewBlocked = false,
  checkingReview = false,
  resolvida = false,
  ato,
  tipoLabel,
  assunto,
  compacto = false,
  readOnly = false,
  disposicaoBE,
  agreementState,
  acionabilidade,
  prazo = null,
  origemLabel = null,
}: {
  intimationId: string;
  providencias: IntimacaoProvidencia[];
  analyzed: boolean;
  analyzing: boolean;
  analysisError?: boolean;
  analysisProcessingTimeout?: boolean;
  onAnalyze: () => void;
  reviewBlocked?: boolean;
  checkingReview?: boolean;
  /** Intimação resolvida (deu-se ciência) — a unidade de trabalho é a intimação. */
  resolvida?: boolean;
  /** ai_act — o ato que ocorreu (ex.: "Sentença"). "" antes da análise. */
  ato: string;
  tipoLabel: string;
  assunto: string;
  compacto?: boolean;
  readOnly?: boolean;
  /** Disposição já classificada pelo BE (GET detalhe, `IntimacaoView.disposicao`)
   *  — usada só como FALLBACK da checagem de divergência abaixo (quando
   *  `agreementState` ausente); opcional. Não substitui a derivação local. */
  disposicaoBE?: IntimacaoDisposicao;
  /** Sinal explícito de divergência vindo do BE ("divergente" quando o motor
   *  aponta que a disposição não bate com o trabalho identificado); os demais
   *  valores (`concordante`/`mera_ciencia`/`sem_analise`/`indeterminado`) e a
   *  ausência do campo NÃO viram conflito. */
  agreementState?: IntimacaoView["agreement_state"];
  /** Sinal A do motor v3 — "o que a intimação EXIGE" (ato/ciência/a
   *  classificar). É o dado que de fato explica a divergência (não o
   *  `tipo_ato` do prazo, que é outro eixo — "que TIPO de ato"). */
  acionabilidade?: IntimacaoAcionabilidade;
  /** Prazo (deadline) desta intimação — fatos do "lado do motor" (tipo do
   *  ato, vencimento, selo) para o contraste sob divergência, e semente do
   *  diálogo "Revisar classificação". null quando ainda não derivado. */
  prazo?: PrazoDetalheView | null;
  /** Rótulo pt-BR já computado da origem da data (`det.memoria.origem.label`,
   *  ex.: "Prazo declarado no ato") — reaproveitado, nunca re-derivado aqui. */
  origemLabel?: string | null;
}) {
  const { disposicao } = useDisposicao({ intimationId, providencias });
  const [revisarAberto, setRevisarAberto] = useState(false);
  const revisarTitleId = useId();

  const bloqueado = reviewBlocked || checkingReview;
  // Sem action_items ⇒ sempre "trabalho a identificar" (CTA Analisar), mesmo
  // que `analyzed` já esteja true (uma análise anterior pode ter concluído
  // sem materializar nenhum item — não há disposição a mostrar).
  const semAnalise = disposicao.vazia;

  // Proteção simples de divergência, duas camadas:
  // 1) Sinal EXPLÍCITO do BE (`agreementState==='divergente'`) — quando
  //    presente, é a fonte de verdade do conflito, independente do que
  //    `disposicaoBE` diga. "excecao"/outros valores de `agreementState`
  //    (nem sempre "divergente") NÃO viram conflito por si.
  // 2) FALLBACK (só quando `agreementState` ausente): compara `disposicaoBE`
  //    ("trabalho"/"ciencia" — os únicos valores comparáveis contra o
  //    `disposicao.tipo` local) com a derivação local. "analisando"/
  //    "sem_prazo"/"excecao"/ausente NÃO viram conflito (dado insuficiente
  //    não inventa divergência) — "excecao" só passará a comparar quando
  //    existir um sinal explícito de conflito de exceção (contrato ainda em
  //    planejamento).
  // Em caso de divergência real: nunca o texto de "mera ciência" (o item, se
  // houver — obrigação ou indeterminado —, continua visível) — só um aviso
  // neutro.
  const conflitoExplicito = agreementState === "divergente";
  const disposicaoBEComparavel: "trabalho" | "ciencia" | null =
    disposicaoBE === "trabalho" || disposicaoBE === "ciencia"
      ? disposicaoBE
      : null;
  const conflitoFallback =
    !conflitoExplicito &&
    agreementState === undefined &&
    disposicaoBEComparavel !== null &&
    disposicaoBEComparavel !== disposicao.tipo;
  const conflitoDisposicao = conflitoExplicito || conflitoFallback;

  // Padrão "ato × só ciência" (o caso observado): o motor não só está em
  // conflito genérico — precisa ESPECIFICAMENTE dizer que a intimação EXIGE
  // cumprimento (`acionabilidade==='ato'`) enquanto a disposição local é
  // TODA ciência (`disposicao.tipo==='ciencia'`, ou seja: NENHUMA peça/
  // obrigação/indeterminado — não basta um item de ciência aparecer num lote
  // MISTO com obrigações; aí o padrão é outro e definir tipo_ato pode, sim,
  // ser parte da resposta certa, que não oferecemos aqui). Só dentro desse
  // padrão exato "marcar sem prazo" é a correção que de fato resolve o
  // agreement — definir um novo tipo_ato não toca o action_item de ciência,
  // então não fecha esse mismatch específico.
  const padraoAtoSoCiencia =
    conflitoExplicito &&
    acionabilidade === "ato" &&
    disposicao.tipo === "ciencia" &&
    disposicao.ciencia !== null &&
    !!prazo &&
    prazoAtivoParaCorrecao(prazo.status);
  // Ação só quando o padrão permite E o modo permite executar (nunca consulta).
  const podeCorrigirParaCiencia = padraoAtoSoCiencia && !readOnly;
  // Nota de GAP depende do PADRÃO, não da permissão — nunca esconder por
  // `readOnly` (senão pareceria que só falta permissão, quando na verdade o
  // padrão observado não tem correção guiada aqui) nem mostrar quando o
  // padrão SERIA corrigível mas o modo é consulta (aí a ausência do CTA já
  // fala por si — "Abrir na Mesa" é o caminho, sem nota extra confundindo
  // permissão com padrão). Nunca esconder o aviso de divergência em si, nem
  // fingir que Dar ciência/Gerar peça resolvem.
  const divergenciaSemCorrecaoGuiada =
    conflitoDisposicao && !padraoAtoSoCiencia;

  // TODOS os itens que não são ciência real nem oportunidade — conhecidos
  // (obrigação) e desconhecidos (indeterminado/"a identificar") — sempre
  // juntos. Um lote MISTO (ex.: 1 obrigação válida + 1 item de tipo
  // desconhecido + 1 oportunidade) mostra as TRÊS classes, nenhuma esconde a
  // outra: obrigação aqui, indeterminado aqui, oportunidade na caixa própria
  // abaixo (nunca "dever de recorrer" misturado com obrigação real).
  const itensTrabalho = [
    ...disposicao.pecas,
    ...disposicao.obrigacoes,
    ...disposicao.indeterminados,
  ].filter((o) => o.tipo !== "recorrer");

  return (
    <section
      id="disposicao-intimacao"
      aria-label="Unidade de trabalho"
      className={cn(
        "border-primary/30 relative flex scroll-mt-6 flex-col overflow-hidden border",
        compacto ? "gap-3 rounded-xl p-4" : "gap-5 rounded-2xl p-5 sm:p-6",
      )}
      style={{
        backgroundImage:
          "linear-gradient(158deg, color-mix(in oklch, var(--primary) 12%, var(--card)), color-mix(in oklch, var(--primary) 4%, var(--card)) 62%, var(--card))",
        boxShadow:
          "0 18px 48px -16px color-mix(in oklch, var(--primary) 34%, transparent), inset 0 1px 0 0 color-mix(in oklch, white 55%, transparent)",
      }}
    >
      {/* accent premium no topo — assinatura primary→gold; puxa o olho pro herói (o trabalho). */}
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, var(--primary), var(--gold), transparent)",
        }}
        aria-hidden
      />
      <div className="min-w-0">
        {!compacto ? <p className="brand-kicker">Unidade de trabalho</p> : null}
        <h2
          className={cn(
            "font-display leading-tight font-medium tracking-tight",
            compacto ? "text-base" : "mt-1.5 text-2xl",
          )}
        >
          {compacto ? "Trabalho a fazer" : "O que fazer com esta intimação"}
        </h2>
      </div>

      {bloqueado ? (
        <p className="text-muted-foreground text-sm" role="status">
          {checkingReview
            ? "Verificando a revisão do tipo e do prazo…"
            : "Confirme o tipo e o prazo desta intimação antes de dar ciência ou construir a peça."}
        </p>
      ) : resolvida ? (
        <p className="text-primary flex items-center gap-2 text-sm font-medium">
          <Check className="size-4" aria-hidden />
          Ciência registrada — nada mais a fazer nesta intimação.
        </p>
      ) : semAnalise ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">
            {analyzing
              ? "Analisando a intimação para descobrir o que aconteceu e o que precisa ser feito…"
              : readOnly
                ? "A análise do trabalho necessário ainda não está disponível."
                : "Analise a intimação para identificar o trabalho necessário."}
          </p>
          {analyzing ? (
            <p
              role="status"
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {analysisProcessingTimeout
                ? ANALYSIS_PROCESSING_MESSAGE
                : "Analisando…"}
            </p>
          ) : !readOnly ? (
            <Button variant="outline" onClick={onAnalyze}>
              <Sparkles data-icon="inline-start" />
              Analisar intimação
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* O QUE ACONTECEU */}
          {!compacto ? (
            <div className="flex flex-col gap-1.5">
              <p className="section-label">O que aconteceu</p>
              <p className="font-display text-lg leading-snug font-medium">
                {ato || tipoLabel}
              </p>
              <p className="text-muted-foreground text-sm">
                {[tipoLabel, assunto].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}

          {/* Estado da disposição (headline já computado em derivarDisposicao —
              "Trabalho a cumprir"/"Trabalho a identificar"/"Ciência") + cada
              item (peça, obrigação ou indeterminado) com seu próprio título/
              descrição, nunca um texto fixo inventado. O item indeterminado é
              EXIBIDO (dado disponível), só não se afirma que tipo de obrigação
              é. SÓ renderiza quando há obrigação/indeterminado/ciência real —
              um lote 100% oportunidade (só recorrer) não mostra uma caixa
              "Trabalho a cumprir" vazia por cima da caixa de Oportunidade
              abaixo (headline continua "trabalho" no dado — recorrer é
              has_obrigacao no BE —, mas a UI não duplica/esvazia a exibição). */}
          {itensTrabalho.length > 0 || disposicao.ciencia !== null ? (
            <div className="border-line bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--shadow-surface)]">
              <p className="section-label">{disposicao.headline}</p>
              {itensTrabalho.length > 0 ? (
                itensTrabalho.map((o) => (
                  <ItemTrabalho
                    key={o.actionItemId}
                    label={o.label}
                    description={o.description}
                    fulfillment={o.fulfillment}
                  />
                ))
              ) : (
                // Conteúdo identificado (item de ciência real). NUNCA
                // suprimir, mesmo sob divergência (`conflitoDisposicao`):
                // suprimir aqui foi o bug reportado — o único fato que a UI
                // tinha desaparecia justo quando mais importava mostrá-lo.
                <ItemTrabalho
                  label={disposicao.ciencia?.title || "Tomar ciência"}
                  description={disposicao.ciencia?.description ?? null}
                />
              )}
            </div>
          ) : null}

          {/* Oportunidade (tipo='recorrer') — DIREITO/FACULDADE, nunca dever:
              caixa própria, separada da obrigação/ciência acima, pra "mistos"
              mostrarem as duas classes sem misturar o vocabulário ("Avaliar
              cabimento…", não "Recorrer"/"deve recorrer"). Item pertence
              simultaneamente a pecas/obrigacoes (índice "meio" de Gerar peça,
              preservado) — aqui é só a MESMA identidade, rotulada à parte. */}
          {disposicao.oportunidades.length > 0 ? (
            <div className="border-line bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--shadow-surface)]">
              <p className="section-label">Oportunidade</p>
              {disposicao.oportunidades.map((o) => (
                <ItemTrabalho
                  key={o.actionItemId}
                  label={o.label}
                  description={o.description}
                  fulfillment={o.fulfillment}
                />
              ))}
              <p className="text-muted-foreground text-xs leading-relaxed">
                Direito de agir dentro do prazo — decisão sua; gerar a peça é
                opcional.
              </p>
            </div>
          ) : null}

          {/* Divergência: contraste de DOIS LADOS (fatos, sem veredito) — o
              lado B (conteúdo identificado) já está na caixa acima; aqui fica
              o lado A (classificação do prazo/motor) + a resolução real
              quando existe uma correção que de fato resolve o agreement. */}
          {conflitoDisposicao ? (
            <div
              role="status"
              className="border-gold/40 bg-gold/5 flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="text-gold-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    A classificação do prazo diverge do conteúdo identificado
                    acima.
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    Compare com o teor e revise a classificação.
                  </p>
                </div>
              </div>
              <div className="surface-inset p-3">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Classificação do prazo (motor)
                </p>
                {/* Hierarquia clara entre os DOIS eixos do motor: acionabilidade
                    ("o que a intimação EXIGE" — o dado que de fato explica a
                    divergência, ex.: "Exige cumprimento") vem PRIMEIRO/em
                    destaque; tipo_ato ("que TIPO de ato" — pode estar
                    indeterminado mesmo com acionabilidade já definida) vem
                    depois, rotulado à parte — um eixo não substitui o outro. */}
                <p className="mt-1.5 text-sm font-medium">
                  {acionabilidade
                    ? ACIONABILIDADE_LABEL[acionabilidade]
                    : "Acionabilidade não definida"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Tipo do ato:{" "}
                  {prazo?.tipo_ato
                    ? tipoAtoLabel(prazo.tipo_ato)
                    : "não definido"}
                </p>
                {origemLabel ? (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {origemLabel}
                  </p>
                ) : null}
                {prazo?.end_date ? (
                  <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                    Vencimento {formatarData(prazo.end_date)}
                    {prazo.selo
                      ? ` · selo ${prazo.selo === "confiavel" ? "confiável" : "a apurar"}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <a
                href="#teor-intimacao"
                className="text-primary focus-visible:ring-ring self-start text-xs underline underline-offset-4 focus-visible:ring-2"
              >
                Ler o teor da intimação
              </a>
              {podeCorrigirParaCiencia ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setRevisarAberto(true)}
                >
                  Revisar classificação
                </Button>
              ) : divergenciaSemCorrecaoGuiada ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Esta divergência ainda não tem uma correção guiada aqui.
                  Definir o tipo do ato completo fica disponível ao gerar uma
                  peça para esta intimação.
                </p>
              ) : null}
            </div>
          ) : null}

          {podeCorrigirParaCiencia ? (
            <Dialog.Root open={revisarAberto} onOpenChange={setRevisarAberto}>
              <Dialog.Portal>
                <Dialog.Backdrop
                  className={cn(
                    "fixed inset-0 z-40 backdrop-blur-[2px]",
                    "bg-[color-mix(in_oklch,var(--foreground)_34%,transparent)]",
                    "transition-opacity duration-200",
                    "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
                  )}
                />
                <Dialog.Popup
                  role="dialog"
                  aria-labelledby={revisarTitleId}
                  aria-modal="true"
                  className={cn(
                    "fixed inset-0 z-50 flex items-center justify-center p-6",
                    "data-[starting-style]:[transform:translateY(8px)_scale(0.98)] data-[starting-style]:opacity-0",
                    "data-[ending-style]:[transform:translateY(8px)_scale(0.98)] data-[ending-style]:opacity-0",
                    "transition-all duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  )}
                >
                  <div className="bg-card border-line shadow-pop relative max-h-[calc(100vh-3rem)] w-full max-w-[480px] overflow-y-auto rounded-2xl border p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Dialog.Title
                        id={revisarTitleId}
                        className="font-display text-lg font-medium"
                      >
                        Revisar classificação
                      </Dialog.Title>
                      <Dialog.Close
                        aria-label="Fechar"
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <X aria-hidden />
                      </Dialog.Close>
                    </div>
                    <Dialog.Description className="text-muted-foreground mb-4 text-[13px] leading-relaxed">
                      O prazo está classificado como{" "}
                      {prazo?.tipo_ato
                        ? tipoAtoLabel(prazo.tipo_ato)
                        : "um ato ativo"}
                      , mas o conteúdo identificado é ciência — &ldquo;
                      {disposicao.ciencia?.title || "Tomar ciência"}
                      &rdquo;. Corrigir fecha o prazo ativo desta intimação; o
                      histórico e o item identificado permanecem. Isto NÃO
                      conclui o atendimento (diferente de &ldquo;Dar
                      ciência&rdquo;).
                    </Dialog.Description>
                    <DefinirTipoAto
                      intimacaoId={intimationId}
                      prazo={prazo}
                      showDefinirForm={false}
                      semPrazoLabel="Corrigir classificação para ciência"
                      onConfirmado={() => setRevisarAberto(false)}
                    />
                  </div>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          ) : null}

          {analyzed && !bloqueado && !readOnly ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={analyzing}
                onClick={onAnalyze}
              >
                <Sparkles data-icon="inline-start" />
                {analyzing ? "Atualizando…" : "Analisar de novo"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {analysisError ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível analisar a intimação. Tente novamente.
        </p>
      ) : null}
    </section>
  );
}
