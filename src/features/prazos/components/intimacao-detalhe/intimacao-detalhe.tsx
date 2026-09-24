"use client";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { DetailCard as Card } from "@/components/shell/detail-card";
import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { SectionTitle } from "@/components/shell/section-title";
import { TeorContent } from "@/components/teor-content";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { MENU_ANIM } from "@/components/ui/menu-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonDetail } from "@/components/ui/skeletons";
import { useFilaNavigation } from "@/features/intimacoes/hooks/use-fila-navigation";
import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";
import { Responsavel } from "@/features/organization/components/responsavel";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { GerarPecaButton } from "@/features/pecas-v2/components/pregen/gerar-peca-button";
import { EXCECAO_MOTIVO_LABEL } from "@/features/triagem/lib/pipeline";
import { cn, formatarData } from "@/lib/utils";

import { useDisposicao } from "../../hooks/use-disposicao";
import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";
import {
  bloqueiaProvidencias,
  prazoAtivoParaCorrecao,
  tipoIncompativelComPrazo,
  tipoIndeterminado,
} from "../../lib/confirmacao";
import { dataEscolhidaNaApuracao } from "../../lib/detalhe-apresentacao";
import { type ModoDetalhe, resolverModoDetalhe } from "../../lib/modo-detalhe";
import { AutosSection } from "./autos-section";
import { DefinirTipoAto } from "./definir-tipo-ato";
import { DisposicaoSection } from "./disposicao-section";
import { ExplicacaoPrazo } from "./explicacao-prazo";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 max-h-72 min-w-48 overflow-y-auto rounded-lg p-1 shadow-md ring-1 outline-none " +
  MENU_ANIM;
const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-disabled:opacity-50";
const DISCLOSURE =
  "group border-border bg-card rounded-xl border shadow-sm overflow-hidden";
const SUMMARY =
  "focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden";

type Detalhe = ReturnType<typeof useIntimacaoDetalhe>;

/** Painel contextual (Mesa/Intimações): mesma composição de conteúdo do modo
 *  página, cromo mais leve (fechar em vez de voltar) e navegação sequencial
 *  IN-PLACE (troca o `id` sem sair da lista) — ver docs/revamp-mesa-trabalho-
 *  intimacoes.md §4. Nunca uma 2ª implementação do conteúdo do detalhe. */
export interface PainelIntimacaoDetalheProps {
  onFechar: () => void;
  onAnterior?: () => void;
  onProxima?: () => void;
  temAnterior: boolean;
  temProxima: boolean;
  /** "execucao" (Mesa de Trabalho) mostra as ações reais (Gerar peça/Dar
   *  ciência/⋮); "consulta" (histórico de Intimações) mostra só "Abrir na
   *  Mesa" — consultar não executa trabalho (docs §4, tabela do Detalhe). */
  modo: ModoDetalhe;
  /** Uma ação de domínio (Dar ciência/Resolver/Ignorar) COMPLETOU/removeu a
   *  intimação da fila ativa — nunca chamado em erro (o item continua aberto,
   *  o usuário tenta de novo) nem por "Gerar peça" (que preserva seu próprio
   *  fluxo de navegar para o editor, sem avanço automático — docs §4). Quem
   *  embute decide o que "avançar" significa (ex.: Mesa vai ao próximo item
   *  visível ou fecha o painel). */
  onAcaoConcluida?: () => void;
}

export function IntimacaoDetalhe({
  id,
  painel,
}: {
  id: string;
  painel?: PainelIntimacaoDetalheProps;
}) {
  const det = useIntimacaoDetalhe(id, {
    onAcaoConcluida: painel?.onAcaoConcluida,
  });
  const fila = useFilaNavigation(painel ? undefined : id);
  const m = det.model;
  // Modo página (deep-link direto): infere do retorno — veio da Mesa (execução)
  // ou de qualquer outro lugar/Intimações (consulta). Modo painel: explícito
  // por quem embute (Mesa sempre execução; Intimações sempre consulta).
  const modo = resolverModoDetalhe(painel?.modo, fila.retorno);

  // Prévia com rolagem independente; cabeçalho e ações ficam fixos no painel.
  if (painel) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="border-line bg-background/95 flex min-h-11 shrink-0 items-center gap-2.5 border-b px-3 py-1">
          <IconAction
            icon={X}
            label="Fechar detalhe"
            onClick={painel.onFechar}
          />
          <h1 className="shrink-0 text-[13px] font-medium">Intimação</h1>
          <nav
            aria-label="Navegação sequencial da intimação"
            className="ml-auto flex shrink-0 items-center gap-1"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!painel.temAnterior}
              aria-label="Item anterior"
              title="Item anterior"
              onClick={painel.onAnterior}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!painel.temProxima}
              aria-label="Próximo item"
              title="Próximo item"
              onClick={painel.onProxima}
            >
              <ChevronRight />
            </Button>
          </nav>
        </div>
        <div
          data-slot="preview-body"
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          {det.isPending ? (
            <PreviewSkeleton />
          ) : det.isError || !m ? (
            <PreviewErro onRetry={det.recarregar} />
          ) : (
            <PreviewIntimacao
              det={det}
              m={m}
              modo={modo}
              onAcaoConcluida={painel.onAcaoConcluida}
            />
          )}
        </div>
      </div>
    );
  }

  const corpo = det.isPending ? (
    <SkeletonDetail />
  ) : det.isError || !m ? (
    <div className="flex flex-col items-start gap-3 p-6">
      <p role="alert">Não foi possível carregar esta intimação.</p>
      <Button variant="outline" onClick={det.recarregar}>
        Tentar novamente
      </Button>
      <Link href={fila.retorno}>{fila.label}</Link>
    </div>
  ) : (
    <CorpoDetalhe
      det={det}
      id={id}
      m={m}
      modo={modo}
      onAcaoConcluida={undefined}
    />
  );

  const shellHeader = (
    <>
      <ShellBackLink href={fila.retorno} label={fila.label} />
      <h1 className="shrink-0 text-[13px] font-medium">Intimação</h1>
      <span className="text-fg3 min-w-0 truncate font-mono text-[11px]">
        {m?.cnj}
      </span>
      <nav
        aria-label="Navegação da intimação"
        className="ml-auto flex shrink-0 items-center gap-1"
      >
        {fila.anterior ? (
          <Link
            href={fila.anterior}
            aria-label="Intimação anterior"
            title="Intimação anterior"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronLeft />
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Intimação anterior"
          >
            <ChevronLeft />
          </Button>
        )}
        {fila.proxima ? (
          <Link
            href={fila.proxima}
            aria-label="Próxima intimação"
            title="Próxima intimação"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronRight />
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Próxima intimação"
          >
            <ChevronRight />
          </Button>
        )}
      </nav>
    </>
  );

  return <PageFrame header={shellHeader}>{corpo}</PageFrame>;
}

// Prévia reutiliza prazo, trabalho e teor da página; só o corpo rola.
function PreviewIntimacao({
  det,
  m,
  modo,
  onAcaoConcluida,
}: {
  det: Detalhe;
  m: NonNullable<Detalhe["model"]>;
  modo: ModoDetalhe;
  onAcaoConcluida?: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const atual = `${pathname}${params.size ? `?${params}` : ""}`;
  const detalheCompletoHref = `/intimacoes/${encodeURIComponent(m.id)}?retorno=${encodeURIComponent(atual)}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        data-slot="preview-scroll"
        className="@container/preview min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-label="Identificação da intimação"
            className="flex min-w-0 flex-col gap-2"
          >
            <span
              className="inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ color: m.estado.cor, backgroundColor: m.estado.fundo }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: m.estado.cor }}
                aria-hidden
              />
              {m.estado.label}
            </span>
            <h2 className="font-display text-xl leading-snug font-semibold tracking-tight break-words">
              {m.titulo}
            </h2>
            {m.ato && m.ato !== m.titulo ? (
              <p className="text-muted-foreground text-sm">{m.ato}</p>
            ) : null}
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
                className="text-primary focus-visible:ring-ring min-w-0 rounded font-mono text-xs break-all underline-offset-4 hover:underline focus-visible:ring-2"
              >
                {m.cnj}
              </Link>
              <IconAction
                icon={Copy}
                label="Copiar número do processo"
                onClick={det.onCopiarCNJ}
              />
            </div>
          </section>

          <PainelPrazo det={det} modo={modo} compacto />
          <Disposicao det={det} modo={modo} compacto />

          <Card>
            <CardHeader>
              <CardTitle>
                <SectionTitle>Partes</SectionTitle>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid min-w-0 gap-3 text-sm break-words">
                <Dado label="Autor" value={m.autor || "Não informado"} />
                <Dado label="Réu" value={m.reu || "Não informado"} />
              </dl>
            </CardContent>
          </Card>

          <Card id="teor-intimacao">
            <CardContent>
              <TeorIntimacao m={m} />
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="border-line bg-background flex shrink-0 flex-col gap-2 border-t p-3">
        <AcoesPrimarias
          det={det}
          modo={modo}
          onAcaoConcluida={onAcaoConcluida}
          className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 [&>[role=alert]]:col-span-full [&>button]:w-full"
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-primary w-full justify-center"
          nativeButton={false}
          render={<Link href={detalheCompletoHref} />}
        >
          Abrir detalhe completo <ArrowRight data-icon="inline-end" />
        </Button>
      </footer>
    </div>
  );
}

/** Mesmo teor colapsável da página de detalhe, também usado no preview. */
function TeorIntimacao({ m }: { m: NonNullable<Detalhe["model"]> }) {
  return (
    <details className="group/teor min-w-0">
      <summary className="focus-visible:ring-ring flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-medium outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
        <span>Ler o teor da intimação</span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open/teor:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="pt-3">
        <TeorContent
          content={m.teor}
          emptyMessage={`Teor integral indisponível. ${m.documentoUrl ? "Consulte o documento de origem." : "Não há documento de origem disponível."}`}
        />
      </div>
    </details>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="border-line flex shrink-0 items-center gap-2 border-t px-4 py-3 sm:px-5">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
    </div>
  );
}

function PreviewErro({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-start justify-center gap-3 px-4 py-6 sm:px-5">
      <p role="alert" className="text-sm">
        Não foi possível carregar esta intimação.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function CorpoDetalhe({
  det,
  id,
  m,
  modo,
  onAcaoConcluida,
}: {
  det: Detalhe;
  id: string;
  m: NonNullable<Detalhe["model"]>;
  modo: ModoDetalhe;
  onAcaoConcluida?: () => void;
}) {
  return (
    <div>
      <div className="reveal-stagger mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7">
        <section
          aria-label="Identificação da intimação"
          className="flex min-w-0 flex-col gap-2 border-b pb-4"
        >
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span>
              {m.tipoLabel} · {m.fonte || "Fonte não informada"}
            </span>
            <span>Publicada em {m.publicadoEm}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                m.estado.tone === "done" && "pop",
              )}
              style={{ color: m.estado.cor, backgroundColor: m.estado.fundo }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: m.estado.cor }}
                aria-hidden
              />
              {m.estado.label}
            </span>
            <div className="ml-auto">
              <AcoesPrimarias
                det={det}
                modo={modo}
                onAcaoConcluida={onAcaoConcluida}
              />
            </div>
          </div>
          {/* TÍTULO = a identidade do PROCESSO (m.titulo = BuildCaseTitle do BE, fonte única) —
              o MESMO título usado em toda lista/superfície, pra a intimação ter título CONSISTENTE
              onde quer que apareça. O ATO que aconteceu (m.ato) vira subtítulo secundário abaixo. */}
          <h2 className="font-display max-w-4xl text-2xl leading-[1.1] font-medium tracking-tight text-balance break-words sm:text-[2rem]">
            {m.titulo}
          </h2>
          {m.ato ? (
            <p className="text-muted-foreground max-w-4xl text-sm leading-snug">
              {m.ato}
            </p>
          ) : null}
          {/* Breadcrumb pro PROCESSO: identidade MÍNIMA pra situar (CNJ + partes) — a ficha
              completa (classe/assunto/órgão/valor/sigilo) vive no cockpit, um clique adiante. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <Link
              href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
              className="text-primary focus-visible:ring-ring rounded font-mono underline-offset-4 hover:underline focus-visible:ring-2"
            >
              {m.cnj}
            </Link>
            <IconAction
              icon={Copy}
              label="Copiar número do processo"
              onClick={det.onCopiarCNJ}
            />
            {m.autor || m.reu ? (
              <span className="text-muted-foreground min-w-0 truncate">
                {m.autor && m.reu ? (
                  <>
                    {m.autor}{" "}
                    <span className="text-muted-foreground/50">×</span> {m.reu}
                  </>
                ) : (
                  m.autor || m.reu
                )}
              </span>
            ) : null}
            {m.fase ? (
              <Badge variant="secondary" className="shrink-0">
                {m.fase}
              </Badge>
            ) : null}
            <Link
              href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
              className="text-primary focus-visible:ring-ring ml-auto shrink-0 rounded text-xs font-medium underline-offset-4 hover:underline focus-visible:ring-2"
            >
              Abrir processo →
            </Link>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[min-content_1fr] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <Disposicao det={det} modo={modo} />
          </div>
          <aside
            id="prazo-decisao"
            aria-label="Prazo e decisão"
            className="flex min-w-0 scroll-mt-6 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <a
              href="#teor-intimacao"
              className="text-primary focus-visible:ring-ring rounded text-sm underline underline-offset-4 focus-visible:ring-2 lg:hidden"
            >
              Ler o teor da intimação
            </a>
            {det.memoria?.divergencia?.pendente ? (
              <ApuracaoPrazo key={id} det={det} />
            ) : null}
            <PainelPrazo det={det} modo={modo} />
          </aside>
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
            {/* O ATO — tudo sobre a publicação que gerou o trabalho: datas, destinatários e o
                teor (colapsado; o herói já resume "o que aconteceu"). Funde 3 seções antigas. */}
            <Card id="teor-intimacao" className="scroll-mt-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    <SectionTitle>O ato</SectionTitle>
                  </CardTitle>
                  {m.documentoUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <a
                          href={m.documentoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                      nativeButton={false}
                    >
                      Documento de origem
                      <ExternalLink data-icon="inline-end" />
                    </Button>
                  ) : null}
                </div>
                <CardDescription>
                  Publicação de {m.publicadoEm} ·{" "}
                  {m.fonte || "Fonte não informada"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <Dado label="Disponibilização" value={m.disponibilizadoEm} />
                  <Dado label="Publicação" value={m.publicadoEm} />
                  <Dado label="Início da contagem" value={m.inicioContagem} />
                </dl>
                {m.destinatarios.length ? (
                  <div>
                    <p className="section-label mb-2">Destinatários</p>
                    <ul className="flex flex-col gap-2">
                      {m.destinatarios.map((r, index) => (
                        <li
                          key={`${r.nome}:${r.oab}:${index}`}
                          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                        >
                          <span className="min-w-0 break-words">{r.nome}</span>
                          {r.oab ? (
                            <span className="text-muted-foreground">
                              OAB {r.oab}
                            </span>
                          ) : null}
                          {r.matched ? (
                            <Badge variant="secondary">OAB monitorada</Badge>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="border-t pt-3">
                  <TeorIntimacao m={m} />
                </div>
              </CardContent>
            </Card>
            <div className="flex min-w-0 flex-col gap-2">
              <AutosSection processId={m.courtRecordId} />
              <Link
                href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
                className="text-primary focus-visible:ring-ring self-start rounded text-xs font-medium underline-offset-4 hover:underline focus-visible:ring-2"
              >
                Ver e sincronizar todos os autos no processo →
              </Link>
            </div>
            <details className={DISCLOSURE}>
              <summary className={SUMMARY}>
                <span>
                  Atividade
                  <span className="text-muted-foreground ml-2 font-normal">
                    {m.trilha.length} registros
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <ol className="flex flex-col px-4 pb-4">
                {m.trilha.length ? (
                  m.trilha.map((t, index) => (
                    <li
                      key={index}
                      className="border-border grid gap-1 border-t py-3 text-sm sm:grid-cols-[110px_1fr]"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {t.data}
                      </span>
                      <span>{t.label}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground text-sm">
                    Sem eventos registrados.
                  </li>
                )}
              </ol>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dado({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

export function PainelPrazo({
  det,
  modo = "execucao",
  compacto = false,
}: {
  det: Detalhe;
  modo?: ModoDetalhe;
  compacto?: boolean;
}) {
  const m = det.model!;
  const p = det.prazoDetalhe;
  const hasDate = !!m.fatalData;
  const [definirTipoAberto, setDefinirTipoAberto] = useState(false);
  const definirTipoTitleId = useId();
  // EXCEÇÃO DE CLASSIFICAÇÃO (não a divergência prazo×obrigação do caso 0b81,
  // que exige item de ciência real + acionabilidade='ato'; aqui não há item
  // nenhum — ausência de action_items NÃO é desacordo). Causa concreta: o
  // tipo do ato não foi identificado. `selo==='a_apurar'` é OBRIGATÓRIO no
  // gate — sem ele este bloco duplicaria o CTA do caso 0b81 (que também tem
  // `tipo_ato` indeterminado, mas `origem='declarado'`/`selo='confiavel'`;
  // sem essa trava, "Prazo provisório"/"Definir tipo do ato" apareceriam ali
  // TAMBÉM, fora do fluxo D1 já resolvido por `DisposicaoSection`/"Revisar
  // classificação" — achado real, não hipotético, corrigido nesta rodada).
  // Permanece exceção até o padrão real deixar de casar — nunca até o rótulo
  // mudar por si (`det.revisao.pendente` continua `true`, ver
  // `situacaoRevisao`, MESMO predicado). Resolve pelo MESMO control canônico
  // `DefinirTipoAto` já usado no gate de peça e na divergência — sem form/
  // componente paralelo.
  const excecaoClassificacao =
    !!p &&
    p.selo === "a_apurar" &&
    tipoIndeterminado(p, det.intimacao?.estado ?? "") &&
    prazoAtivoParaCorrecao(p.status);
  const podeDefinirTipoAto = excecaoClassificacao && modo === "execucao";
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle>Prazo e responsável</SectionTitle>
          </CardTitle>
          <CardDescription>
            {det.memoria?.origem?.label ??
              (det.intimacao?.estado === "a_classificar"
                ? "Classificação pendente"
                : "Intimação sem prazo definido")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="surface-inset relative overflow-hidden p-4 pl-5"
            style={
              hasDate
                ? {
                    backgroundColor: `color-mix(in oklch, ${m.prazoCor} 5%, transparent)`,
                  }
                : undefined
            }
          >
            {/* accent lateral reflete a urgência (vermelho=atraso, gold=hoje, neutro=folga) */}
            {hasDate ? (
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: m.prazoCor }}
                aria-hidden
              />
            ) : null}
            <p className="text-muted-foreground text-xs">
              {hasDate && det.revisao.pendente
                ? "Vencimento registrado · sujeito à revisão"
                : "Vencimento"}
            </p>
            <p
              className="font-display mt-1 text-3xl leading-tight font-semibold tracking-tight tabular-nums transition-colors duration-300"
              style={{ color: hasDate ? m.prazoCor : undefined }}
            >
              {m.fatalData ||
                (det.intimacao?.estado === "a_classificar"
                  ? "Prazo a definir"
                  : "Sem prazo")}
            </p>
            {hasDate ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {m.prazoNum} {m.prazoFrase}
              </p>
            ) : null}
            {det.memoria?.notaInterna ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {det.memoria.notaInterna}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            {p && (!compacto || tipoIncompativelComPrazo(p)) ? (
              <dl className="text-sm">
                <Dado
                  label="Tipo do ato"
                  value={
                    tipoIncompativelComPrazo(p)
                      ? `${tipoAtoLabel(p.tipo_ato!)} · incompatível com prazo ativo; revise o tipo`
                      : p.tipo_ato
                        ? tipoAtoLabel(p.tipo_ato)
                        : "A definir"
                  }
                />
              </dl>
            ) : null}
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                Responsável pela intimação
              </p>
              {modo === "consulta" ? (
                <Responsavel value={m.responsavelId} nome={m.responsavelNome} />
              ) : (
                <ResponsavelMenu
                  label="Responsável pela intimação"
                  value={m.responsavelId}
                  nome={m.responsavelNome}
                  membros={det.membros}
                  emVoo={det.assignEmVoo}
                  onAssign={det.onAssign}
                />
              )}
            </div>
          </div>
          {det.memoriaPending ? (
            <div role="status" aria-label="Carregando situação do prazo">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ) : det.memoriaErro ? (
            <div role="alert">
              <p className="text-sm">Não foi possível consultar o prazo.</p>
              <Button variant="outline" size="sm" onClick={det.recarregarPrazo}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="border-border border-t pt-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                {det.revisao.pendente ? (
                  <TriangleAlert className="text-gold-foreground size-4" />
                ) : (
                  <Check className="text-primary size-4" />
                )}
                {det.revisao.label}
              </p>
              {p?.confirmed_at ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {p.confirmed_by_name ? `${p.confirmed_by_name} · ` : ""}
                  {formatarData(p.confirmed_at)}
                  {det.memoria?.divergencia?.decisaoLabel
                    ? ` · ${det.memoria.divergencia.decisaoLabel}`
                    : ""}
                </p>
              ) : null}
              {excecaoClassificacao ? (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {det.intimacao?.excecao_motivo === "provisorio"
                      ? EXCECAO_MOTIVO_LABEL.provisorio
                      : "O sistema não identificou o tipo do ato. Revise a classificação e confira o prazo registrado."}
                  </p>
                  {podeDefinirTipoAto ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefinirTipoAberto(true)}
                    >
                      Definir tipo do ato
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          {compacto && det.memoria?.divergencia?.pendente ? (
            <p role="note" className="text-gold-foreground text-xs">
              Há divergência entre as datas do prazo. Abra o detalhe completo
              para revisar antes de agir.
            </p>
          ) : null}
          {!compacto && p && p.status !== "NO_DEADLINE" ? (
            <ExplicacaoPrazo prazo={p} estado={det.intimacao?.estado ?? ""} />
          ) : null}
          {!compacto ? <CalculoDetalhado det={det} /> : null}
        </CardContent>
      </Card>
      {podeDefinirTipoAto ? (
        <Dialog.Root
          open={definirTipoAberto}
          onOpenChange={setDefinirTipoAberto}
        >
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
              aria-labelledby={definirTipoTitleId}
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
                    id={definirTipoTitleId}
                    className="font-display text-lg font-medium"
                  >
                    Definir tipo do ato
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Fechar"
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <X aria-hidden />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="text-muted-foreground mb-4 text-[13px] leading-relaxed">
                  O tipo do ato desta intimação ainda não foi identificado.
                  Defina o tipo e a contagem, ou marque que não há prazo.
                </Dialog.Description>
                <DefinirTipoAto
                  intimacaoId={m.id}
                  prazo={p}
                  onConfirmado={() => setDefinirTipoAberto(false)}
                />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </>
  );
}

function ApuracaoPrazo({ det }: { det: Detalhe }) {
  const [ajustando, setAjustando] = useState(false);
  const [data, setData] = useState("");
  const cv = det.memoria!.divergencia!;
  return (
    <Card role="region" aria-label="Apuração do vencimento">
      <CardHeader>
        <CardTitle>
          <h2>Revisar vencimento</h2>
        </CardTitle>
        <CardDescription>
          Há uma diferença de {cv.difDias} dias. Confira a determinação no
          documento antes de escolher.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="surface-inset p-3">
            <p className="text-muted-foreground text-xs">
              Pelo prazo informado no ato
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {cv.declarada}
            </p>
          </div>
          <div className="surface-inset p-3">
            <p className="text-muted-foreground text-xs">
              Pela regra de cálculo
            </p>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {cv.calculada}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            disabled={det.memoriaEmVoo}
            onClick={det.onAceitarDeclarado}
          >
            Usar prazo informado no ato
          </Button>
          <Button
            variant="outline"
            disabled={det.memoriaEmVoo}
            onClick={det.onAceitarCalculado}
          >
            Usar data calculada pela regra
          </Button>
        </div>
        {ajustando ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (data) det.onAjusteManual(data);
            }}
          >
            <Field>
              <FieldLabel htmlFor="data-apuracao">
                Vencimento escolhido
              </FieldLabel>
              <Input
                id="data-apuracao"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={det.memoriaEmVoo}
              />
            </Field>
            <Button disabled={!data || det.memoriaEmVoo} type="submit">
              Registrar data escolhida
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={det.memoriaEmVoo}
              onClick={() => setAjustando(false)}
            >
              Cancelar ajuste
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setAjustando(true)}
            disabled={det.memoriaEmVoo}
          >
            Escolher outra data
          </Button>
        )}
        {det.apuracaoErro ? (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível registrar a decisão. Tente novamente.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CalculoDetalhado({ det }: { det: Detalhe }) {
  const memoria = det.memoria;
  const p = det.prazoDetalhe;
  if (!memoria || !p) return null;
  return (
    <details className={DISCLOSURE}>
      <summary className={SUMMARY}>
        Memória completa e feriados
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <dl className="flex flex-col gap-4">
          {memoria.cadeia
            .filter((item) => item.kicker !== "SEM DOBRA")
            .map((item) => (
              <div key={item.kicker}>
                <dt className="text-muted-foreground text-xs">{item.kicker}</dt>
                <dd className="mt-1 text-sm font-medium">{item.valor}</dd>
                <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {item.sub}
                </dd>
              </div>
            ))}
        </dl>
        {!memoria.temCalcMemory ? (
          <p className="text-muted-foreground text-sm">
            Memória detalhada não disponível para este prazo.
          </p>
        ) : null}
        {p.manual_extra_days ? (
          <p className="text-sm">
            {p.manual_extra_days} dia(s) adicional(is) na contagem.
          </p>
        ) : null}
        {memoria.notaInterna ? (
          <p className="text-sm">{memoria.notaInterna}</p>
        ) : null}
        {p.legal_citation ? (
          <p className="text-muted-foreground text-xs">
            Referência registrada: {p.legal_citation}
          </p>
        ) : null}
        <div className="border-border border-t pt-3">
          <h3 className="text-sm font-medium">Feriados e suspensões</h3>
          {dataEscolhidaNaApuracao(p) ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Registros do cálculo anterior à escolha da data.
            </p>
          ) : null}
          {memoria.feriados.length ? (
            <ul className="mt-2 flex flex-col gap-3">
              {memoria.feriados.map((f, i) => (
                <li key={`${f.data}:${i}`} className="text-sm">
                  <span className="text-muted-foreground mr-2 tabular-nums">
                    {f.data}
                  </span>
                  {f.nome}
                  {f.ambito !== "—" ? (
                    <span className="text-muted-foreground block text-xs">
                      {f.ambito}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">
              Nenhum feriado ou suspensão aplicado.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

function Disposicao({
  det,
  modo = "execucao",
  compacto = false,
}: {
  det: Detalhe;
  modo?: ModoDetalhe;
  compacto?: boolean;
}) {
  const m = det.model!;
  return (
    <DisposicaoSection
      compacto={compacto}
      readOnly={modo === "consulta"}
      intimationId={m.id}
      providencias={m.providencias}
      analyzing={det.analisando}
      analysisError={det.analiseErro}
      analysisProcessingTimeout={det.analiseTimeout}
      analyzed={m.analisada}
      onAnalyze={det.onAnalisar}
      reviewBlocked={bloqueiaProvidencias(
        det.prazoDetalhe,
        det.intimacao?.estado ?? "",
      )}
      checkingReview={det.memoriaPending || det.memoriaErro}
      resolvida={m.userStatus === "RESOLVED"}
      ato={det.intimacao?.ai_act ?? ""}
      tipoLabel={m.tipoLabel}
      assunto={m.assunto}
      disposicaoBE={det.intimacao?.disposicao}
      agreementState={det.intimacao?.agreement_state}
      prazo={det.prazoDetalhe}
      origemLabel={det.memoria?.origem?.label ?? null}
      acionabilidade={det.intimacao?.acionabilidade}
    />
  );
}

// AcoesPrimarias — as duas ações primárias da intimação (Gerar peça · Dar ciência)
// no TOPO do detalhe, ao lado do ⋮, SEM gate de análise: valem direto, sem precisar
// "analisar" antes. Gerar peça exige uma providência (alvoId); Dar ciência sempre
// funciona (sem item materializado, resolve a intimação). São bloqueadas apenas
// quando o tipo/prazo ainda precisa de revisão (mesmo bloqueio do Alert do topo).
function AcoesPrimarias({
  det,
  modo,
  onAcaoConcluida,
  className,
}: {
  det: Detalhe;
  modo: ModoDetalhe;
  onAcaoConcluida?: () => void;
  className?: string;
}) {
  const m = det.model!;
  const { disposicao, onDarCiencia, dandoCiencia, cienciaErro } = useDisposicao(
    {
      intimationId: m.id,
      providencias: m.providencias,
      onSucesso: onAcaoConcluida,
    },
  );

  // Consulta (histórico de Intimações): nenhuma ação de EXECUÇÃO aqui — só
  // "Abrir na Mesa", que leva ao mesmo id na aba/seção correspondente
  // (docs/revamp-mesa-trabalho-intimacoes.md §4, tabela do Detalhe).
  if (modo === "consulta") {
    return (
      <Button
        size="sm"
        variant="outline"
        render={
          <Link
            href={`/triagem?painel=${encodeURIComponent(m.id)}${
              det.intimacao?.lifecycle ? `&tab=${det.intimacao.lifecycle}` : ""
            }`}
          />
        }
        nativeButton={false}
      >
        Abrir na Mesa
        <ExternalLink data-icon="inline-end" />
      </Button>
    );
  }

  // Enquanto o prazo/memória carrega, seguramos as ações (evita agir sobre estado
  // incompleto). O gate cobre o pre-flight da peça inline (dentro do botão único).
  const carregando = det.memoriaPending || det.memoriaErro;

  // "Dar ciência" mantém o bloqueio de revisão (a intimação vira ciência) — o gate
  // da peça é assunto do GerarPecaButton.
  const cienciaBloqueada =
    carregando ||
    bloqueiaProvidencias(det.prazoDetalhe, det.intimacao?.estado ?? "");

  // Alvo do botão "Gerar peça", intencional (não incidental): a 1ª peça
  // formal; senão a 1ª obrigação sem peça (o editor também produz a petição
  // dela, ex.: "indicar endereço"); senão o 1º item indeterminado (tipo não
  // identificado, mas ainda assim um dado real a trabalhar); senão o item de
  // ciência (o BE deriva o tipo). "" quando nada há → botão off. Não exige
  // `geraPeca=true` — o advogado pode gerar peça para qualquer item pendente.
  const pecaAlvo =
    disposicao.pecas[0] ??
    disposicao.obrigacoes[0] ??
    disposicao.indeterminados[0] ??
    null;
  const alvoId = pecaAlvo?.geraPeca ? pecaAlvo.actionItemId : undefined;

  // Intimação em estado terminal (resolvida/ignorada) — a unidade de trabalho é a
  // própria intimação, então nada mais a gerar/concluir: só o menu (⋮ Reabrir).
  if (m.podeReabrir) {
    return <AcoesIntimacao det={det} />;
  }

  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2", className)}
    >
      <GerarPecaButton
        intimacaoId={m.id}
        processoId={m.courtRecordId}
        actionItemId={alvoId}
        existingActionItemId={!alvoId ? pecaAlvo?.actionItemId : undefined}
        retorno={`/intimacoes/${m.id}`}
        degree={det.intimacao?.degree}
        jaIniciada={!!alvoId && pecaAlvo?.jaIniciada}
        pecaLabel={pecaAlvo?.label}
        disabled={carregando || !m.id}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={cienciaBloqueada || dandoCiencia}
        onClick={onDarCiencia}
      >
        {dandoCiencia ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Check data-icon="inline-start" />
        )}
        Dar ciência
      </Button>
      <AcoesIntimacao det={det} />
      {cienciaErro ? (
        <p role="alert" className="text-destructive w-full text-right text-xs">
          Não foi possível dar ciência. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}

function AcoesIntimacao({ det }: { det: Detalhe }) {
  const m = det.model!;
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label="Mais ações da intimação"
      >
        <MoreHorizontal />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup className={POPUP_CLASS}>
            {m.podeReabrir ? (
              <Menu.Item
                className={ITEM_CLASS}
                disabled={det.triagemEmVoo}
                onClick={det.onReabrir}
              >
                Reabrir intimação
              </Menu.Item>
            ) : (
              <>
                <Menu.Item
                  className={ITEM_CLASS}
                  disabled={det.triagemEmVoo}
                  onClick={det.onResolver}
                >
                  Marcar intimação como resolvida
                </Menu.Item>
                <Menu.Item
                  className={ITEM_CLASS}
                  disabled={det.triagemEmVoo}
                  onClick={det.onIgnorar}
                >
                  Ignorar intimação
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
