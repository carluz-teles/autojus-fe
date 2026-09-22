"use client";
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DetailCard as Card } from "@/components/shell/detail-card";
import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { SectionTitle } from "@/components/shell/section-title";
import { TeorContent } from "@/components/teor-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { GerarPecaModal } from "@/features/pecas-v2/components/pregen/gerar-peca-modal";
import { PecaGateModal } from "@/features/pecas-v2/components/pregen/peca-gate-modal";
import { setInstructions } from "@/features/pecas-v2/lib/instructions-storage";
import { cn, formatarData } from "@/lib/utils";

import { useDisposicao } from "../../hooks/use-disposicao";
import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";
import {
  bloqueiaProvidencias,
  precisaConfirmarPrazo,
  tipoIncompativelComPrazo,
  tipoIndeterminado,
} from "../../lib/confirmacao";
import { dataEscolhidaNaApuracao } from "../../lib/detalhe-apresentacao";
import { AutosSection } from "./autos-section";
import { ConfirmacaoPrazo } from "./confirmacao-prazo";
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

export function IntimacaoDetalhe({ id }: { id: string }) {
  const det = useIntimacaoDetalhe(id);
  const fila = useFilaNavigation(id);
  const m = det.model;
  const reviewBlocked = bloqueiaProvidencias(
    det.prazoDetalhe,
    det.intimacao?.estado ?? "",
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

  if (det.isPending)
    return (
      <PageFrame header={shellHeader}>
        <SkeletonDetail />
      </PageFrame>
    );
  if (det.isError || !m)
    return (
      <PageFrame header={shellHeader}>
        <div className="flex flex-col items-start gap-3 p-6">
          <p role="alert">Não foi possível carregar esta intimação.</p>
          <Button variant="outline" onClick={det.recarregar}>
            Tentar novamente
          </Button>
          <Link href={fila.retorno}>{fila.label}</Link>
        </div>
      </PageFrame>
    );

  return (
    <PageFrame header={shellHeader}>
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
                <AcoesPrimarias det={det} />
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
                      <span className="text-muted-foreground/50">×</span>{" "}
                      {m.reu}
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

          {reviewBlocked && (
            <Alert variant="destructive" className="p-4">
              <TriangleAlert />
              <AlertTitle>
                Confirmação obrigatória antes de gerar a peça
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <p>
                  O tipo ou o prazo desta intimação ainda precisa de revisão.
                  Gerar a peça e dar ciência ficam bloqueados até resolver essa
                  pendência.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href="#prazo-decisao" />}
                  nativeButton={false}
                >
                  Revisar tipo e prazo
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[min-content_1fr] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <Disposicao det={det} />
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
              <DecisaoTipoPrazo id={id} det={det} />
              <PainelPrazo det={det} />
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
                    <Dado
                      label="Disponibilização"
                      value={m.disponibilizadoEm}
                    />
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
                            <span className="min-w-0 break-words">
                              {r.nome}
                            </span>
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
                  <details className="group border-t pt-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium outline-none [&::-webkit-details-marker]:hidden">
                      <span>Ler o teor da intimação</span>
                      <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pt-3">
                      <TeorContent
                        content={m.teor}
                        emptyMessage={`Teor integral indisponível. ${m.documentoUrl ? "Consulte o documento de origem." : "Não há documento de origem disponível."}`}
                      />
                    </div>
                  </details>
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
    </PageFrame>
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

// DecisaoTipoPrazo — o control de tipo/prazo do detalhe, com DUAS portas:
//   (a) o prazo precisa de confirmação/definição (revisão, divergência de tipo,
//       estado a_classificar/ia) → ConfirmacaoPrazo (form completo, com contagem,
//       ajustes e "revisei"). Fluxo inalterado.
//   (b) o prazo NÃO exige confirmação (declarado/aceito/futuro), mas o TIPO DO ATO
//       ainda está indeterminado ("" ou "indeterminado") → DefinirTipoAto, o dropdown
//       autônomo que resolve só o tipo (e o prazo em dias), SEMPRE disponível.
// Sem prazo detalhado ainda → nada a decidir aqui.
function DecisaoTipoPrazo({ id, det }: { id: string; det: Detalhe }) {
  const p = det.prazoDetalhe;
  if (!p) return null;
  const estado = det.intimacao?.estado ?? "";

  if (precisaConfirmarPrazo(p, estado)) {
    return (
      <ConfirmacaoPrazo
        key={`${p.id}:${p.confirmed_at ?? "pending"}`}
        id={id}
        prazo={p}
        estado={estado}
      />
    );
  }

  if (tipoIndeterminado(p, estado)) {
    return (
      <Card role="region" aria-label="Definir tipo do ato">
        <CardHeader>
          <CardTitle>
            <SectionTitle>Definir tipo do ato</SectionTitle>
          </CardTitle>
          <CardDescription>
            O tipo do ato ainda não foi classificado. Informe o tipo do ato (e a
            contagem) para completar a análise desta intimação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DefinirTipoAto
            intimacaoId={id}
            prazo={p}
            onConfirmado={det.recarregarPrazo}
          />
        </CardContent>
      </Card>
    );
  }

  return null;
}

function PainelPrazo({ det }: { det: Detalhe }) {
  const m = det.model!;
  const p = det.prazoDetalhe;
  const hasDate = !!m.fatalData;
  return (
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
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {p ? (
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
            <ResponsavelMenu
              label="Responsável pela intimação"
              value={m.responsavelId}
              nome={m.responsavelNome}
              membros={det.membros}
              emVoo={det.assignEmVoo}
              onAssign={det.onAssign}
            />
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
          </div>
        )}
        {p && p.status !== "NO_DEADLINE" ? (
          <ExplicacaoPrazo prazo={p} estado={det.intimacao?.estado ?? ""} />
        ) : null}
        <CalculoDetalhado det={det} />
      </CardContent>
    </Card>
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

function Disposicao({ det }: { det: Detalhe }) {
  const m = det.model!;
  return (
    <DisposicaoSection
      intimationId={m.id}
      providencias={m.providencias}
      retorno={`/intimacoes/${m.id}`}
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
    />
  );
}

// AcoesPrimarias — as duas ações primárias da intimação (Gerar peça · Dar ciência)
// no TOPO do detalhe, ao lado do ⋮, SEM gate de análise: valem direto, sem precisar
// "analisar" antes. Gerar peça exige uma providência (alvoId); Dar ciência sempre
// funciona (sem item materializado, resolve a intimação). São bloqueadas apenas
// quando o tipo/prazo ainda precisa de revisão (mesmo bloqueio do Alert do topo).
function AcoesPrimarias({ det }: { det: Detalhe }) {
  const router = useRouter();
  const m = det.model!;
  const {
    disposicao,
    onDarCiencia,
    dandoCiencia,
    cienciaErro,
    modalOpen,
    pendingActionItemId,
    openGerarModal,
    closeGerarModal,
    buildGerarUrl,
    pecaLabel,
  } = useDisposicao({
    intimationId: m.id,
    providencias: m.providencias,
    retorno: `/intimacoes/${m.id}`,
  });

  // Pre-flight (gate) da geração de peça — o gate REAL. A análise é cosmética e
  // nunca bloqueia; o gate roda ao clicar "Gerar peça".
  const [gateOpen, setGateOpen] = useState(false);

  // Enquanto o prazo/memória carrega, seguramos as ações (evita agir sobre estado
  // incompleto). O tipo do ato NÃO bloqueia mais o botão: o gate cobre isso inline.
  const carregando = det.memoriaPending || det.memoriaErro;

  // "Dar ciência" mantém o bloqueio de revisão (a intimação vira ciência) — o gate
  // é só do caminho da peça.
  const cienciaBloqueada =
    carregando ||
    bloqueiaProvidencias(det.prazoDetalhe, det.intimacao?.estado ?? "");

  // Tipo do ato confirmado? Check 1 do gate. Sem prazo derivado + estado a
  // classificar/ia = ainda não confirmado.
  const tipoConfirmado = det.prazoDetalhe
    ? !precisaConfirmarPrazo(det.prazoDetalhe, det.intimacao?.estado ?? "")
    : !bloqueiaProvidencias(det.prazoDetalhe, det.intimacao?.estado ?? "");

  // Peça-alvo do botão "Gerar peça": a 1ª que gera peça; se só houver ciência, usa
  // o próprio item de ciência (o BE deriva o tipo). "" quando nada há → botão off.
  const pecaAlvo = disposicao.pecas[0] ?? null;
  const alvoId =
    pecaAlvo?.actionItemId ?? disposicao.ciencia?.actionItemId ?? "";

  function handleGenerate(instructions: string) {
    const url = buildGerarUrl(pendingActionItemId);
    if (instructions) setInstructions(pendingActionItemId, instructions);
    router.push(url);
  }

  // Clique em "Gerar peça": peça já iniciada → abre direto; senão, abre o pre-flight.
  function onGerarPeca() {
    if (!alvoId) return;
    if (pecaAlvo?.jaIniciada) {
      router.push(buildGerarUrl(alvoId));
    } else {
      setGateOpen(true);
    }
  }

  // Pre-flight passou (ou o usuário optou por seguir) → modal de orientação → navega.
  function onGatePassou() {
    if (!alvoId) return;
    openGerarModal(alvoId);
  }

  // Intimação em estado terminal (resolvida/ignorada) — a unidade de trabalho é a
  // própria intimação, então nada mais a gerar/concluir: só o menu (⋮ Reabrir).
  if (m.podeReabrir) {
    return <AcoesIntimacao det={det} />;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" onClick={onGerarPeca} disabled={carregando || !alvoId}>
        <Sparkles data-icon="inline-start" />
        {pecaAlvo?.jaIniciada ? "Abrir peça" : "Gerar peça"}
      </Button>
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
      <PecaGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        intimacaoId={m.id}
        processoId={m.courtRecordId}
        degree={det.intimacao?.degree}
        prazo={det.prazoDetalhe}
        tipoConfirmado={tipoConfirmado}
        pecaLabel={pecaLabel || disposicao.pecas[0]?.label}
        onProceed={onGatePassou}
        onConfigurarTribunal={() => router.push("/configuracoes?tab=fontes")}
      />
      <GerarPecaModal
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) closeGerarModal();
        }}
        onGenerate={handleGenerate}
        pecaLabel={pecaLabel}
      />
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
