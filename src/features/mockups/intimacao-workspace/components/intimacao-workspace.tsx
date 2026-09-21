"use client";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { useIntimacaoWorkspaceMock } from "../hooks/use-intimacao-workspace-mock";
import {
  DOCUMENTOS,
  INTIMACAO,
  MINUTA,
  type MockProvidencia,
  PROVIDENCIA_RECOMENDADA,
  PROVIDENCIAS,
  TESES,
} from "../mock-data";

type Workspace = ReturnType<typeof useIntimacaoWorkspaceMock>;

const JORNADA = ["Decisão", "Minuta", "Peça", "Resolvida"] as const;

const CONFIANCA_CHIP = {
  alta: { label: "Alta", className: "bg-primary/15 text-primary" },
  media: { label: "Média", className: "bg-gold/20 text-gold-foreground" },
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
} as const;

/**
 * Mockup do redesign da jornada principal: intimação → providência → peça numa
 * tela só. A intimação é a unidade de trabalho; o centro da tela se transforma
 * (decisão → geração inline → minuta → protocolo) sem nenhuma navegação.
 */
export function IntimacaoWorkspaceMock() {
  const ws = useIntimacaoWorkspaceMock();
  return (
    <PageFrame header={<Cabecalho ws={ws} />}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-5">
        <Identidade />
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(250px,280px)_minmax(0,1fr)_minmax(260px,300px)]">
          <ContextoRail />
          <PalcoCentral ws={ws} />
          <FundamentosRail ws={ws} />
        </div>
      </div>
    </PageFrame>
  );
}

function Cabecalho({ ws }: { ws: Workspace }) {
  return (
    <>
      <ShellBackLink href="/intimacoes" label="Voltar para a fila" />
      <h1 className="shrink-0 text-[13px] font-medium">Intimação</h1>
      <span className="text-fg3 min-w-0 truncate font-mono text-[11px]">
        {INTIMACAO.cnj}
      </span>
      <Badge
        variant="outline"
        className="border-gold/40 bg-gold/[0.08] text-gold-foreground shrink-0"
      >
        Mockup do redesign
      </Badge>
      <ol
        aria-label="Progresso da intimação"
        className="ml-auto hidden shrink-0 items-center gap-1.5 lg:flex"
      >
        {JORNADA.map((rotulo, i) => (
          <li key={rotulo} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden className="text-fg3 size-3" />}
            <span
              className={cn(
                "flex items-center gap-1 text-[11px]",
                i < ws.indiceJornada
                  ? "text-primary"
                  : i === ws.indiceJornada
                    ? "text-foreground font-medium"
                    : "text-fg3",
              )}
            >
              {i < ws.indiceJornada ? (
                <Check aria-hidden className="size-3" />
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    i === ws.indiceJornada ? "bg-primary" : "bg-line",
                  )}
                />
              )}
              {rotulo}
            </span>
          </li>
        ))}
      </ol>
      <span className="text-fg3 hidden shrink-0 text-[11px] sm:inline">
        3 de 14 na fila
      </span>
    </>
  );
}

/** Identidade da intimação — o anchor "que caso é este", padrão do detalhe atual. */
function Identidade() {
  return (
    <section
      aria-label="Identificação da intimação"
      className="border-line flex min-w-0 flex-col gap-1 border-b pb-3"
    >
      <div className="text-fg3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
        <span>
          {INTIMACAO.tipoLabel} · {INTIMACAO.fonte}
        </span>
        <span>Publicada {INTIMACAO.publicadaEm}</span>
        <span>
          {INTIMACAO.classe} · {INTIMACAO.assunto}
        </span>
      </div>
      <h2 className="font-display max-w-3xl text-xl leading-tight font-medium tracking-tight text-balance sm:text-2xl">
        {INTIMACAO.titulo}
      </h2>
    </section>
  );
}

/** Rail esquerdo: o contexto da intimação, persistente em todas as etapas. */
function ContextoRail() {
  return (
    <aside
      aria-label="Contexto da intimação"
      className="flex min-w-0 flex-col gap-3"
    >
      <section aria-label="Prazo" className="surface-panel p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl leading-none font-medium">
            15
          </span>
          <span className="text-fg2 text-sm">dias úteis</span>
        </div>
        <p className="text-fg2 mt-1.5 text-xs">Vence segunda, 6 de outubro</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge label="Prazo validado" tone="success" />
          <Badge variant="outline">Contestação · art. 335 CPC</Badge>
        </div>
      </section>

      <details open className="surface-panel overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Teor da intimação
        </summary>
        <div className="prose-intimacao text-fg2 border-line2 border-t px-4 py-3 text-xs leading-relaxed">
          {INTIMACAO.teor.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </div>
      </details>

      <section className="surface-panel p-4">
        <p className="section-label">Processo</p>
        <Link
          href="/processos"
          className="text-primary mt-2 block truncate font-mono text-xs underline-offset-4 hover:underline"
        >
          {INTIMACAO.cnj}
        </Link>
        <p className="text-fg2 mt-1 text-xs">{INTIMACAO.orgao}</p>
        <dl className="mt-3 flex flex-col gap-2 text-xs">
          <div>
            <dt className="text-fg3">Autora</dt>
            <dd className="mt-0.5">{INTIMACAO.autor}</dd>
          </div>
          <div>
            <dt className="text-fg3">Réu · cliente</dt>
            <dd className="mt-0.5 font-medium">{INTIMACAO.reu}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-panel p-4">
        <p className="section-label">Autos do processo</p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {DOCUMENTOS.map((doc) => (
            <li key={doc.nome} className="flex items-center gap-2 text-xs">
              <FileText aria-hidden className="text-fg3 size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{doc.nome}</span>
              <span className="text-fg3 shrink-0 font-mono text-[10px]">
                {doc.fls}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

/** Centro: o palco que se transforma conforme a etapa — sem trocar de tela. */
function PalcoCentral({ ws }: { ws: Workspace }) {
  return (
    <section aria-label="Trabalho da intimação" className="min-w-0">
      {ws.etapa === "decisao" && <CardDecisao ws={ws} />}
      {(ws.etapa === "gerando" || ws.etapa === "pronta") && (
        <CardPeca ws={ws} />
      )}
      {ws.etapa === "concluida" && <PainelConcluido ws={ws} />}
    </section>
  );
}

function CardDecisao({ ws }: { ws: Workspace }) {
  const incluidas = ws.selecao.incluidas.size;
  return (
    <div className="reveal flex flex-col gap-4">
      <section aria-label="Leitura da IA" className="surface-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="section-label">O que esta intimação pede</p>
          <span className="text-fg3 text-[11px]">
            Analisada pela IA há 2 min
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed">{INTIMACAO.resumoIA}</p>
      </section>

      <section aria-label="Providência" className="surface-panel p-5">
        <p className="section-label">Providência</p>
        <div
          role="radiogroup"
          aria-label="Escolha da providência"
          className="mt-3 flex flex-col gap-2"
        >
          <OpcaoProvidencia prov={PROVIDENCIA_RECOMENDADA} ws={ws} destaque />
          <details className="group">
            <summary className="text-fg2 hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 py-1 text-xs [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden
                className="size-3 transition-transform group-open:rotate-90"
              />
              Outras providências ({PROVIDENCIAS.length - 1}) — manifestar,
              cumprir, ciência
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {PROVIDENCIAS.filter((prov) => !prov.recomendada).map((prov) => (
                <OpcaoProvidencia key={prov.id} prov={prov} ws={ws} />
              ))}
            </div>
          </details>
        </div>

        <div className="border-line2 mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          {ws.providencia.geraPeca ? (
            <>
              <Button size="lg" onClick={ws.gerarMinuta}>
                <Sparkles aria-hidden /> Gerar minuta
              </Button>
              <p className="text-fg2 min-w-0 flex-1 text-xs leading-relaxed">
                A {ws.providencia.pecaLabel?.toLowerCase()} nasce com os{" "}
                {incluidas} fundamentos selecionados ao lado — tudo nesta tela.
              </p>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={ws.registrarSemMinuta}
              >
                <Check aria-hidden /> Registrar e resolver
              </Button>
              <p className="text-fg2 min-w-0 flex-1 text-xs leading-relaxed">
                Providência sem peça: registra, resolve a intimação e devolve
                você à fila.
              </p>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={ws.ignorarIntimacao}>
            Ignorar intimação
          </Button>
        </div>
      </section>
    </div>
  );
}

function OpcaoProvidencia({
  prov,
  ws,
  destaque = false,
}: {
  prov: MockProvidencia;
  ws: Workspace;
  destaque?: boolean;
}) {
  const ativa = prov.id === ws.providenciaId;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={() => ws.escolherProvidencia(prov.id)}
      className={cn(
        "rounded-lg border text-left transition-colors",
        destaque ? "p-4" : "p-3",
        ativa ? "border-primary/40 bg-selected" : "border-line hover:bg-hover",
      )}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            ativa
              ? "border-primary bg-primary text-primary-foreground"
              : "border-line2",
          )}
        >
          {ativa && <Check className="size-3" />}
        </span>
        <span className={cn("font-medium", destaque ? "text-base" : "text-sm")}>
          {prov.titulo}
        </span>
        {prov.recomendada && (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            Recomendada · confiança alta
          </Badge>
        )}
        {prov.geraPeca && (
          <span className="text-fg3 text-[11px]">
            Gera peça: {prov.pecaLabel}
          </span>
        )}
      </span>
      {(destaque || ativa) && (
        <span className="text-fg2 mt-1.5 block pl-6 text-xs leading-relaxed">
          {prov.detalhe}
        </span>
      )}
    </button>
  );
}

/**
 * Peça vinculada: a intimação acompanha a saga de geração e entrega na tela de
 * peça existente — construção (edição, resumo, anexos, protocolação) continua
 * lá. O card fecha o ciclo de volta aqui quando a peça é protocolada.
 */
function CardPeca({ ws }: { ws: Workspace }) {
  const gerando = ws.etapa === "gerando";
  return (
    <section aria-label="Peça vinculada" className="surface-panel reveal p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="section-label">Peça vinculada</p>
        <StatusBadge
          label={gerando ? "Gerando minuta" : "Minuta pronta para revisão"}
          tone={gerando ? "info" : "success"}
        />
        <span className="text-fg3 ml-auto text-[11px]">
          {ws.providencia.pecaLabel} · {INTIMACAO.cnj}
        </span>
      </div>

      {gerando ? <GeracaoEmAndamento ws={ws} /> : <MinutaPronta ws={ws} />}
    </section>
  );
}

function GeracaoEmAndamento({ ws }: { ws: Workspace }) {
  return (
    <>
      <div className="mt-4 flex items-center gap-2.5">
        <span aria-hidden className="relative inline-flex size-2.5 shrink-0">
          <span className="bg-primary absolute inset-0 rounded-full" />
          <span className="bg-primary absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
        </span>
        <h3 className="font-display text-xl">
          Gerando a {ws.providencia.pecaLabel?.toLowerCase()}
        </h3>
      </div>
      <p className="text-fg2 mt-1.5 text-xs">
        A geração roda no servidor — dá para seguir para a próxima intimação; o
        card atualiza sozinho.
      </p>
      <ol className="mt-5 flex flex-col gap-3">
        {ws.geracao.passos.map((rotulo, i) => {
          const feito = i < ws.geracao.passo;
          const atual = i === ws.geracao.passo;
          return (
            <li key={rotulo} className="flex items-center gap-2.5 text-sm">
              {feito ? (
                <Check aria-hidden className="text-primary size-4 shrink-0" />
              ) : atual ? (
                <Loader2
                  aria-hidden
                  className="text-primary size-4 shrink-0 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <span
                  aria-hidden
                  className="border-line2 size-4 shrink-0 rounded-full border"
                />
              )}
              <span
                className={cn(
                  feito ? "text-fg2" : atual ? "font-medium" : "text-fg3",
                )}
              >
                {rotulo}
              </span>
              {i === 1 && atual && (
                <span className="text-fg2 text-xs tabular-nums">
                  {ws.geracao.ancorados} de {ws.selecao.incluidas.size}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div
        aria-hidden
        className="bg-line2 mt-5 h-0.5 overflow-hidden rounded-full"
      >
        <span
          className="theses-progress-bar block h-full w-2/5 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--primary), transparent)",
          }}
        />
      </div>
    </>
  );
}

function MinutaPronta({ ws }: { ws: Workspace }) {
  return (
    <>
      <h3 className="font-display mt-4 text-xl">Contestação</h3>
      <p className="text-fg2 mt-1 text-xs">
        {MINUTA.secoes.length} seções · {ws.selecao.incluidas.size} fundamentos
        ancorados · cita fls. 34-41 e 52
      </p>
      <ol className="mt-3 flex flex-col gap-1.5">
        {MINUTA.secoes.map((secao) => {
          const tese = secao.teseId
            ? TESES.find((t) => t.id === secao.teseId)
            : undefined;
          return (
            <li
              key={secao.romano}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
            >
              <span className="text-fg3 w-7 shrink-0 font-mono text-[11px]">
                {secao.romano}
              </span>
              <span>{secao.titulo}</span>
              {tese && (
                <span className="text-fg3 flex items-center gap-1 text-[11px]">
                  <BookOpen aria-hidden className="size-3 shrink-0" />
                  {tese.titulo}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="border-line2 mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button size="lg" onClick={ws.abrirPeca}>
          <ArrowUpRight aria-hidden /> Abrir construção da peça
        </Button>
        <p className="text-fg2 min-w-0 flex-1 text-xs leading-relaxed">
          Edição, resumo, anexos, assinatura e protocolação seguem na tela de
          peça de hoje. A intimação acompanha o estado até a resolução.
        </p>
        <Button variant="ghost" size="sm" onClick={ws.simularProtocolo}>
          Simular protocolo
        </Button>
      </div>
      {ws.abriuPeca && (
        <p className="text-fg3 mt-3 text-[11px]">
          No app real este botão navega para{" "}
          <span className="font-mono">/pecas/:id</span> — a tela de construção
          atual, sem mudanças.
        </p>
      )}
    </>
  );
}

function PainelConcluido({ ws }: { ws: Workspace }) {
  const copy =
    ws.desfecho === "protocolo"
      ? {
          titulo: "Intimação resolvida",
          descricao:
            "Contestação protocolada pela tela de peça. A intimação acompanhou o ciclo inteiro: decisão, minuta e protocolo.",
        }
      : ws.desfecho === "ignorada"
        ? {
            titulo: "Intimação ignorada",
            descricao:
              "Registrada como ignorada e fora da fila de trabalho. Dá para reverter no histórico.",
          }
        : {
            titulo: "Providência registrada",
            descricao:
              "Sem peça a produzir: a providência foi registrada e a intimação resolvida.",
          };
  return (
    <section
      aria-label="Intimação resolvida"
      className="surface-panel reveal flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <span className="bg-success/10 text-success flex size-12 items-center justify-center rounded-full">
        <BadgeCheck aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-2xl">{copy.titulo}</h2>
      <p className="text-fg2 max-w-md text-sm leading-relaxed">
        {copy.descricao}
      </p>
      {ws.desfecho === "protocolo" && (
        <p className="text-fg3 font-mono text-xs">
          Protocolo eproc nº 2025.0012345-6
        </p>
      )}
      <Button size="lg" className="mt-3" onClick={ws.proximaDaFila}>
        Próxima intimação da fila <ArrowRight aria-hidden />
      </Button>
      <p className="text-fg3 text-[11px]">
        2 de 14 restantes · no mockup, a jornada reinicia
      </p>
    </section>
  );
}

/** Rail direito: fundamentos vivos desde a decisão — a "Partida" deixa de existir. */
function FundamentosRail({ ws }: { ws: Workspace }) {
  const bloqueado = ws.etapa !== "decisao";
  return (
    <aside aria-label="Fundamentos" className="min-w-0">
      <div className="surface-panel p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg">Fundamentos</h2>
          <span className="text-fg3 text-[11px] tabular-nums">
            {ws.selecao.incluidas.size} de {TESES.length} incluídos
          </span>
        </div>
        <p className="text-fg2 mt-1.5 text-xs leading-relaxed">
          {ws.etapa === "decisao"
            ? "Sugeridos já na análise da intimação. Ajuste antes de gerar — a minuta nasce com eles."
            : "Enviados com a minuta. Ajustes de fundamentos seguem na tela de construção da peça."}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {TESES.map((tese) => {
            const incluida = ws.selecao.incluidas.has(tese.id);
            const chip = CONFIANCA_CHIP[tese.confianca];
            return (
              <li key={tese.id}>
                <button
                  type="button"
                  aria-pressed={incluida}
                  disabled={bloqueado}
                  onClick={() => ws.selecao.alternar(tese.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-[color,background-color,border-color,opacity] disabled:opacity-60",
                    incluida
                      ? "border-primary/40 bg-selected"
                      : "border-line hover:bg-hover opacity-75 hover:opacity-100",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs leading-snug font-medium">
                      {tese.titulo}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        chip.className,
                      )}
                    >
                      {chip.label}
                    </span>
                  </span>
                  <span className="text-fg2 mt-1 block text-[11px] leading-relaxed">
                    {tese.fundamento}
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2">
                    {tese.fonte ? (
                      <span className="text-fg3 flex items-center gap-1 text-[10px]">
                        <BookOpen aria-hidden className="size-3 shrink-0" />
                        {tese.fonte}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium",
                        incluida ? "text-primary" : "text-fg3",
                      )}
                    >
                      {incluida ? (
                        <>
                          <Check aria-hidden className="size-3" /> Incluído
                        </>
                      ) : (
                        "Incluir"
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
