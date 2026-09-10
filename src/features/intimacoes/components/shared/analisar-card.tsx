"use client";
// AnalisarCard — o card "Analisar esta intimação" (3 estados: pré-análise/loading/
// pós-análise com providências) + ProvidenciaRow. Extraído de intimacao-detail.tsx
// (Regra nº1): o master-detail (print 2 da spec) reusa EXATAMENTE o estado de
// pré-análise (mesmo componente, mesma copy aprovada — nenhuma menção a "IA") no
// painel lateral compacto, e o print 1 reusa a lista de providências pós-análise.
//
// Pós migração action_item (tabela real, endereçada por id — não mais jsonb por
// índice): ProvidenciaRow reage ao `status` de trabalho (SUGGESTED→TODO→WORKING→DONE,
// sem estado de descarte). "Iniciar providência" chama /v1/action-items/:id/iniciar
// (SUGGESTED→TODO); "Confirmar tipo" chama /v1/action-items/:id/confirmar (gate de tipo
// a_confirmar→confiável) — são ações DISTINTAS, não o mesmo botão.
//
// Layout da seção "Providências" segue docs/design-card-providencias-v2.md (v2.1) —
// fonte de verdade LITERAL (extraída do .dc.html canônico), substitui INTEIRAMENTE a
// v1. `ProvidenciasLinhaLegal`, `ProvidenciasBanner` e `ComoIALeuCard` são exportados
// porque também são consumidos por IntimacaoDetalhe (features/prazos) — o card
// "Providências" de lá tem seu próprio header (não reusa <AnalisarCard/> inteiro),
// mas usa os MESMOS blocos internos, pra não duplicar a heurística de
// selo/confiança em dois lugares (Regra nº1).
//
// v2.1 (correção do usuário): a trilha "1·Ato / 2·Prazo / 3·Providências" foi
// removida por decisão explícita, mesmo estando no .dc.html original —
// `ProvidenciasLinhaLegal` (ex-`ProvidenciasBreadcrumb`) hoje só renderiza a linha
// de detalhe legal. E "Como a IA leu" deixou de ser um card novo separado do card
// "Análise" — é o MESMO card (ver `ComoIALeuCard`, corpo = `ai_summary` real).
//
// Mapeamento de tokens do mock pro nosso design system: onde o .dc.html usa
// `var(--accent)` para ênfase (ícone, "Criar todas", borda do "Gerar minuta", label
// "Como a IA leu"), usamos `var(--primary)`/`text-primary`/`bg-primary` — no NOSSO
// globals.css o slot shadcn `--accent` foi mantido neutro (cinza) e é `--primary`
// quem recebeu o teal vibrante do mockup na migração da casca (ver comentário em
// src/app/globals.css). `var(--gold)`/`var(--green)` batem 1:1 com o mock.
import { Check, Loader2, Plus, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { toast } from "sonner";

import { TeorContent } from "@/components/teor-content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// Rótulo do status de trabalho: fonte única (Regra nº1) em action-items/lib/status-pill;
// não redefinir localmente (o board e a fila consomem o MESMO mapa).
import {
  STATUS_LABEL,
  STATUS_PILL,
} from "@/features/action-items/lib/status-pill";
import { formatarData, formatarDataHora } from "@/lib/utils";

import {
  useAnalisarIntimacao,
  useConfirmarActionItem,
  useIniciarProvidencia,
  useIntimacaoDetalhe,
} from "../../hooks/use-intimacoes";
import type { IntimacaoDetalheView, IntimacaoProvidencia } from "../../types";
import { EyebrowTitle } from "./eyebrow-title";

/** Rótulo em PT do tipo de providência — fallback quando o action_item não tem
 *  `title` persistido (itens anteriores à migração 0090, ou análise degradada). */
const TIPO_LABEL: Record<string, string> = {
  contestar: "Contestar",
  recorrer: "Recorrer",
  manifestar: "Manifestar-se",
  cumprir: "Cumprir determinação",
  ciencia: "Dar-se por ciente",
};

function rotuloTipo(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

/**
 * Heurística de confiança da classificação do ato — usada tanto na cor da
 * pílula "1 · Ato" do breadcrumb quanto no rótulo `{{ atoConf }}` do card "Como
 * a IA leu" (docs/design-card-providencias-v2.md §2 e §6: a doc pede a MESMA
 * derivação nos dois pontos). Cobre só os 2 casos reais do pipeline hoje:
 *  • ALGUM action_item com tipo_origem="ia" → "IA · confiança {média}%" (média
 *    das `confianca` desses itens, arredondada) — cor var(--primary).
 *  • senão (100% declarado, ou reclassificado manualmente sem nenhum item de
 *    origem IA sobrando) → "Declarado na intimação" — cor var(--green).
 * O terceiro caso do mock ("Divergente · revisar") é conceito do Motor de
 * Prazos pro PRAZO, não pro Ato, e não existe neste ponto do pipeline — omitido
 * de propósito (ver v2 §6), não é um esquecimento.
 */
function atoConfianca(itens: IntimacaoProvidencia[]): {
  label: string;
  cor: string;
} {
  const inferidos = itens.filter((p) => p.tipo_origem === "ia");
  if (inferidos.length > 0) {
    const confiancas = inferidos
      .map((p) => p.confianca)
      .filter((c): c is number => c != null);
    const media =
      confiancas.length > 0
        ? Math.round(
            (confiancas.reduce((soma, c) => soma + c, 0) / confiancas.length) *
              100,
          )
        : 0;
    return { label: `confiança ${media}%`, cor: "var(--primary)" };
  }
  return { label: "Declarado na intimação", cor: "var(--green)" };
}

/**
 * Selo/nasce do BANNER (§3 do v2) — agregado do LOTE, pior caso: se QUALQUER
 * item visível ainda for `tipo_status="a_confirmar"`, o banner inteiro mostra
 * "A apurar"/"triagem — confirme o tipo primeiro"; só quando TODOS já forem
 * "confiavel" o banner mostra "Confiável"/"A fazer". O mock tinha um selo único
 * por lote; nosso modelo tem `tipo_status` POR item (mais rico — ver
 * `seloItemInfo`, usado na linha de cada providência). Isto é uma extensão
 * razoável do mock pro nosso modelo, documentada aqui por pedido explícito do
 * v2 (não é invenção arbitrária).
 */
function bannerSeloNasce(itens: IntimacaoProvidencia[]): {
  selo: string;
  nasce: string;
} {
  const algumAConfirmar = itens.some((p) => p.tipo_status === "a_confirmar");
  return algumAConfirmar
    ? { selo: "A apurar", nasce: "triagem — confirme o tipo primeiro" }
    : { selo: "Confiável", nasce: "A fazer" };
}

/** Selo POR ITEM (§4 do v2) — mapeia direto de `tipo_status`, sem agregação. */
function seloItemInfo(status: IntimacaoProvidencia["tipo_status"]): {
  label: string;
  cor: string;
} {
  return status === "a_confirmar"
    ? { label: "A apurar", cor: "var(--gold)" }
    : { label: "Confiável", cor: "var(--green)" };
}

/** Badge pequeno com cor dinâmica (± dot) — usado pelos badges de tipo/selo da
 *  linha de providência. `dot`=true desenha o marcador redondo à esquerda do
 *  texto (o selo por item, §4 do v2); os demais (Peça/Ciência/fluxo curto) não
 *  têm dot. */
function RowBadge({
  children,
  cor,
  fundo,
  dot,
}: {
  children: ReactNode;
  cor: string;
  fundo: string;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium"
      style={{ color: cor, background: fundo }}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-[5px] shrink-0 rounded-full"
          style={{ background: cor }}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Linha de detalhe legal, no topo do bloco Providências
 * (docs/design-card-providencias-v2.md §2, v2.1). A trilha "1·Ato / 2·Prazo /
 * 3·Providências" do `.dc.html` original foi removida por decisão explícita do
 * usuário — NÃO renderizar, mesmo estando no mock. Só a linha de detalhe
 * sobrevive, e é best-effort: cita só a publicação real (DJEN); NÃO inventamos
 * artigo de lei/regra de contagem (o mock hardcoda "art. 219, CPC" por regex,
 * que não é dado real). Sem `published_at`, omite o bloco inteiro (nunca uma
 * linha vazia/"—").
 */
export function ProvidenciasLinhaLegal({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  if (!i.published_at) return null;

  return (
    <div className="border-line2 border-b px-4 py-3">
      <p className="text-fg3 text-[11px]">
        Publicação no DJEN em {formatarData(i.published_at)}
      </p>
    </div>
  );
}

/**
 * Banner "Cada providência vira uma tarefa…" (docs/design-card-providencias-v2.md
 * §3 — texto completo). Sem prazo vinculado, a frase perde a cláusula do
 * prazo/selo (não mostramos "fatal —"). Ver `bannerSeloNasce` pro selo/nasce
 * agregado do lote. SEM CTA "Criar todas" — removido por decisão explícita do
 * usuário (v2.1): criar tarefa é sempre uma decisão por item, nunca em lote.
 */
export function ProvidenciasBanner({
  intimacao: i,
  itens,
}: {
  intimacao: IntimacaoDetalheView;
  itens: IntimacaoProvidencia[];
}) {
  const { selo, nasce } = bannerSeloNasce(itens);
  const fatalDate = i.prazo ? formatarData(i.prazo.end_date) : null;

  return (
    <div className="bg-bg border-line2 border-b px-4 py-2.5">
      <p className="text-fg2 text-[13px] leading-relaxed">
        {fatalDate ? (
          <>
            Cada providência é uma unidade de trabalho, vinculada ao prazo que
            já existe (fatal {fatalDate}) e herdando o selo{" "}
            <strong className="font-medium">{selo}</strong> — entra em{" "}
            <strong className="font-medium">{nasce}</strong>.
          </>
        ) : (
          <>
            Cada providência é uma unidade de trabalho — confirme o tipo antes
            de iniciar.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Card "Como a IA leu" (coluna secundária, docs/design-card-providencias-v2.md
 * §6, v2.1 — correção do usuário). Este é o MESMO card "Análise" que já
 * existia (mostrava só `ai_summary`) — não um card novo separado: aqui ele
 * ganha o visual accent/primary do `.dc.html` (label "LEITURA DO TEOR" + ato em
 * serif + confiança à direita) por cima do corpo real. O corpo é o `ai_summary`
 * de verdade (prop `resumo`). Some quando ainda não há providências. Traz o botão
 * "Confirmar tipo" (POST /confirmar) quando alguma providência do lote ainda está
 * com o gate de tipo em "a_confirmar" — é o gate de TIPO, separado do "Iniciar
 * providência" (que roda por linha). Ver `atoConfianca` pra heurística de confiança.
 */
export function LeituraDoTeorCard({
  intimacaoId,
  ato,
  resumo,
  itens,
}: {
  intimacaoId: string;
  ato: string;
  resumo: string;
  itens: IntimacaoProvidencia[];
}) {
  const confirmar = useConfirmarActionItem(intimacaoId);
  if (itens.length === 0) return null;
  const conf = atoConfianca(itens);
  const aConfirmar = itens.filter((p) => p.tipo_status === "a_confirmar");

  const onConfirmarTipo = () => {
    for (const p of aConfirmar) {
      confirmar.mutate(p.id, {
        onError: () =>
          toast.error("Não foi possível confirmar o tipo. Tente novamente."),
      });
    }
  };

  return (
    <div
      className="rounded-xl border px-4 py-3.5 shadow-sm"
      style={{
        borderColor: "color-mix(in oklch, var(--primary) 26%, transparent)",
        background: "color-mix(in oklch, var(--primary) 5%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary text-[11px] font-semibold tracking-[0.03em] uppercase">
          Leitura do teor
        </span>
        <span className="text-fg3 ml-auto font-mono text-[10.5px]">
          {conf.label}
        </span>
      </div>
      <p className="font-display mt-2 mb-1 text-[16px]">{ato || "—"}</p>
      <p className="text-fg2 text-[11.5px] leading-relaxed">{resumo}</p>
      {aConfirmar.length > 0 ? (
        <Button
          size="sm"
          onClick={onConfirmarTipo}
          disabled={confirmar.isPending}
          className="mt-3"
          style={{ background: "var(--primary)" }}
        >
          {confirmar.isPending ? (
            <Loader2
              data-icon="inline-start"
              className="animate-spin"
              strokeWidth={2.2}
            />
          ) : (
            <Check data-icon="inline-start" strokeWidth={2.2} />
          )}
          Confirmar tipo
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Card central de análise. Três estados:
 *  • LOADING (mutation em voo): spinner + linha de status + 3 skeletons.
 *  • PRÉ (ai_analyzed_at == null): CTA "Gerar análise".
 *  • PÓS (ai_analyzed_at != null): "O QUE ACONTECEU" (resumo) + seção "Providências"
 *    (por status de trabalho SUGGESTED→TODO→WORKING→DONE — ver ProvidenciaRow pros
 *    estados de cada uma) + rodapé de proveniência + "Gerar novamente". Resumo vazio =
 *    modo degradado.
 * O botão dispara useAnalisarIntimacao(id) → estado LOADING; erro → toast + alerta.
 */
export function AnalisarCard({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  const analisar = useAnalisarIntimacao(i.id);
  // Mesma query key do detalhe já carregado pelo pai (React Query dedupe) — só
  // lemos o flag derivado da janela de poll pra saber se a materialização das
  // providências ainda está em curso após uma análise recém-disparada.
  const { materializandoAnalise } = useIntimacaoDetalhe(i.id);

  const gerar = () =>
    analisar.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível gerar a análise. Tente novamente."),
    });

  // LOADING: enquanto a mutation está em voo OU enquanto as providências ainda
  // materializam de forma assíncrona no BE após a análise (o POST volta em ~2s,
  // mas as linhas de action_item só aparecem no GET seguinte, alguns instantes
  // depois — `materializandoAnalise` cobre esse gap; auto-off pelo teto do poll
  // e pelo caso legítimo de análise sem providência). Card bordado com skeleton
  // (independe de pré/pós).
  if (analisar.isPending || materializandoAnalise) return <AnalisarLoading />;

  // Pré-análise: nunca analisada ainda → CTA centrado.
  if (!i.ai_analyzed_at) {
    return (
      <section className="flex flex-col items-center rounded-2xl border border-dashed border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-[color-mix(in_oklch,var(--gold)_6%,transparent)] px-6 py-9 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--gold)_16%,transparent)] text-[var(--gold-foreground)] ring-1 ring-[color-mix(in_oklch,var(--gold)_22%,transparent)]">
          <Sparkles className="size-5" strokeWidth={1.6} />
        </span>
        <h3 className="font-display text-foreground mt-4 text-[20px] leading-tight font-normal">
          Analisar esta intimação
        </h3>
        <p className="text-muted-foreground mt-2 max-w-[400px] text-[13.5px] leading-relaxed text-pretty">
          Leitura do teor da publicação para gerar o resumo do que aconteceu e
          as providências a cumprir. Você revisa antes de iniciar cada uma.
        </p>
        {analisar.isError ? (
          <p role="alert" className="text-destructive mt-4 text-[13px]">
            Não foi possível gerar a análise. Tente novamente.
          </p>
        ) : null}
        <Button className="mt-5" onClick={gerar}>
          <Sparkles data-icon="inline-start" strokeWidth={1.8} />
          Gerar análise
        </Button>
      </section>
    );
  }

  // Pós-análise. Modo degradado = analisada mas summary vazio.
  const degradado = !i.ai_summary?.trim();
  // Providências (action_item), endereçadas por id.
  const itens = i.ai_providencias;

  return (
    <section className="surface-panel px-5 py-5 sm:px-6 sm:py-6">
      {degradado ? (
        <p
          role="alert"
          className="text-muted-foreground text-[14px] leading-relaxed"
        >
          Análise indisponível no momento. Tente novamente.
        </p>
      ) : (
        <>
          <EyebrowTitle>O que aconteceu</EyebrowTitle>
          <p className="text-foreground/90 mt-2.5 text-[14px] leading-relaxed">
            {i.ai_summary}
          </p>

          {itens.length > 0 ? (
            <div className="border-line bg-panel mt-7 overflow-hidden rounded-xl border shadow-sm">
              <div className="border-line2 flex items-center gap-2 border-b px-4 pt-3.5 pb-3">
                <Sparkles className="text-primary size-4" strokeWidth={1.8} />
                <span className="text-foreground text-[13px] font-semibold">
                  Providências
                </span>
                <span className="text-fg3 text-[11.5px]">
                  revise antes de iniciar
                </span>
                <span className="text-fg3 ml-auto font-mono text-[11px]">
                  {itens.length}
                </span>
              </div>

              <ProvidenciasLinhaLegal intimacao={i} />
              <ProvidenciasBanner intimacao={i} itens={itens} />

              <ul>
                {itens.map((p) => (
                  <ProvidenciaRow
                    key={p.id}
                    intimacaoId={i.id}
                    providencia={p}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="border-border/70 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-[12px]">
          Gerado em {formatarDataHora(i.ai_analyzed_at)} · revise antes de dar
          andamento
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={gerar}
        >
          <RotateCcw data-icon="inline-start" strokeWidth={1.8} />
          Gerar novamente
        </Button>
      </div>
    </section>
  );
}

/** Estado LOADING do card de análise: status + 3 barras de skeleton. */
export function AnalisarLoading() {
  return (
    <section
      className="surface-panel px-5 py-5 sm:px-6 sm:py-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Loader2
          className="text-primary mt-0.5 size-6 shrink-0 animate-spin"
          strokeWidth={1.8}
        />
        <div className="min-w-0">
          <p className="text-foreground text-[15px] font-medium">
            Analisando o teor da publicação…
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">
            Lendo o processo, identificando o prazo e derivando as providências.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[85%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </section>
  );
}

/** Código curto e estável da providência (derivado do uuid) — PRV-XXXX; o design
 *  usa o prefixo curto na pílula (docs/design-card-providencias-v2.md). */
export function codigoProvidencia(id: string, prefix = "PRV-"): string {
  return `${prefix}${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Confirma o tipo sugerido, inicia o trabalho e oferece a próxima ação da providência. */
export function ProvidenciaRow({
  intimacaoId,
  providencia: p,
}: {
  intimacaoId: string;
  providencia: IntimacaoProvidencia;
}) {
  const iniciar = useIniciarProvidencia(intimacaoId);
  const confirmar = useConfirmarActionItem(intimacaoId);
  const onConfirmarTipo = () =>
    confirmar.mutate(p.id, {
      onError: () =>
        toast.error("Não foi possível confirmar o tipo. Tente novamente."),
    });
  const emVoo = iniciar.isPending;
  const erro = iniciar.isError || confirmar.isError;

  const onIniciar = () =>
    iniciar.mutate(p.id, {
      onError: () =>
        toast.error("Não foi possível iniciar a providência. Tente novamente."),
    });

  const iniciada = p.status !== "SUGGESTED";
  const titulo = p.title || rotuloTipo(p.tipo);
  const descricao = p.description;
  const selo = seloItemInfo(p.tipo_status);

  return (
    // Grid 1fr auto — fiel ao .dc.html (Prazos-Linear, bloco <sc-for as="pv">).
    <li className="border-line2 hover:bg-hover grid grid-cols-1 items-center gap-3 border-b px-4 py-4 transition-colors sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <span className="font-display text-foreground block text-base font-medium">
          {titulo}
        </span>
        {descricao ? (
          <TeorContent
            content={descricao}
            className="text-muted-foreground mt-1"
          />
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* tipo (Peça=gold / Ciência=cinza) — badge 9.5px do design */}
          {p.gera_peca ? (
            <RowBadge
              cor="var(--gold)"
              fundo="color-mix(in oklch, var(--gold) 12%, transparent)"
            >
              Peça
            </RowBadge>
          ) : (
            <RowBadge cor="var(--fg3)" fundo="var(--hover)">
              {rotuloTipo(p.tipo)}
            </RowBadge>
          )}
          <RowBadge
            cor={selo.cor}
            fundo={`color-mix(in oklch, ${selo.cor} 12%, transparent)`}
            dot
          >
            {p.tipo_status === "a_confirmar"
              ? "Tipo a confirmar"
              : p.tipo_origem === "declarado"
                ? "Tipo declarado"
                : "Tipo revisado"}
          </RowBadge>
          {/* Chip da providência iniciada — leva a /providencias/:id. */}
          {iniciada ? (
            <Link
              href={`/providencias/${p.id}`}
              className={`focus-visible:ring-ring inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 ${STATUS_PILL[p.status]}`}
              title={STATUS_LABEL[p.status]}
            >
              {p.status === "DONE" ? <Check className="size-3" /> : null}
              {STATUS_LABEL[p.status]}
            </Link>
          ) : null}
        </span>

        {erro ? (
          <span
            role="alert"
            className="text-destructive mt-2 block text-[12px]"
          >
            Não foi possível concluir a ação. Tente novamente.
          </span>
        ) : null}
      </div>

      {/* Coluna de ação (auto) */}
      {iniciada ? (
        <span className="inline-flex w-full items-center gap-2 sm:w-auto">
          {p.gera_peca ? (
            <GerarPecaDaProvidencia providencia={p} intimacaoId={intimacaoId} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              render={<Link href={`/providencias/${p.id}`} />}
              nativeButton={false}
            >
              Acompanhar providência
            </Button>
          )}
        </span>
      ) : p.tipo_status === "a_confirmar" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onConfirmarTipo}
          disabled={confirmar.isPending}
          className="w-full sm:w-auto"
        >
          {confirmar.isPending
            ? "Confirmando…"
            : "Confirmar tipo da providência"}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onIniciar}
          disabled={emVoo}
          className="w-full sm:w-auto"
          style={{
            borderColor: "color-mix(in oklch, var(--primary) 45%, transparent)",
            background: "color-mix(in oklch, var(--primary) 7%, transparent)",
            color: "var(--primary)",
          }}
        >
          {emVoo ? (
            <Loader2
              data-icon="inline-start"
              className="animate-spin"
              strokeWidth={2.2}
            />
          ) : (
            <Plus data-icon="inline-start" strokeWidth={2.2} />
          )}
          Iniciar providência
        </Button>
      )}
    </li>
  );
}

/** Abre as teses da providência iniciada, preservando seu vínculo e a rota de retorno. */
function GerarPecaDaProvidencia({
  intimacaoId,
  providencia: p,
}: {
  providencia: IntimacaoProvidencia;
  intimacaoId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (!p.gera_peca || p.status === "SUGGESTED") return null;

  const onClick = () =>
    router.push(
      `/pecas/nova?intimacao=${intimacaoId}&providencia=${p.id}&retorno=${encodeURIComponent(params.get("retorno") ?? "/intimacoes")}`,
    );

  return (
    <Button
      type="button"
      size="sm"
      className="w-full sm:w-auto"
      onClick={onClick}
    >
      <Sparkles data-icon="inline-start" aria-hidden />
      Gerar peça
    </Button>
  );
}
