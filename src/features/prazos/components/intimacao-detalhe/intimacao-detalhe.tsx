"use client";
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MoreHorizontal,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DetailCard as Card } from "@/components/shell/detail-card";
import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
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
import { ProvidenciasSection } from "@/features/action-items/components/providencias-section";
import { useFilaNavigation } from "@/features/intimacoes/hooks/use-fila-navigation";
import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { formatarData } from "@/lib/utils";

import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";
import {
  bloqueiaProvidencias,
  precisaConfirmarPrazo,
  tipoIncompativelComPrazo,
} from "../../lib/confirmacao";
import { dataEscolhidaNaApuracao } from "../../lib/detalhe-apresentacao";
import { ConfirmacaoPrazo } from "./confirmacao-prazo";
import { ExplicacaoPrazo } from "./explicacao-prazo";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 max-h-72 min-w-48 overflow-y-auto rounded-lg p-1 shadow-md ring-1 outline-none";
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
        <p role="status" className="text-muted-foreground p-6">
          Carregando intimação…
        </p>
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
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
        <section
          aria-label="Identificação da intimação"
          className="flex min-w-0 flex-col gap-2 border-b pb-4"
        >
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span>
              {m.tipoLabel} · {m.fonte || "Fonte não informada"}
            </span>
            <span>Publicada em {m.publicadoEm}</span>
            <Badge variant="outline">
              Intimação {m.statusLabel.toLowerCase()}
            </Badge>
            <div className="ml-auto">
              <AcoesIntimacao det={det} />
            </div>
          </div>
          <h2 className="font-display max-w-4xl text-xl leading-tight font-medium tracking-tight text-balance break-words sm:text-2xl">
            {m.titulo}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
              className="text-primary focus-visible:ring-ring rounded font-mono text-sm underline-offset-4 hover:underline focus-visible:ring-2"
            >
              {m.cnj}
            </Link>
            <IconAction
              icon={Copy}
              label="Copiar número do processo"
              onClick={det.onCopiarCNJ}
            />
            <span className="text-muted-foreground text-xs">{m.orgao}</span>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">
                Autor / polo ativo
              </dt>
              <dd className="mt-1 break-words">{m.autor || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">
                Réu / polo passivo
              </dt>
              <dd className="mt-1 break-words">{m.reu || "Não informado"}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-xs">
            {[m.classe, m.assunto, m.tribunalGrau]
              .filter((value) => value && !m.titulo.includes(value))
              .join(" · ")}
          </p>
        </section>

        {reviewBlocked && (
          <Alert variant="destructive" className="p-4">
            <TriangleAlert />
            <AlertTitle>
              Confirmação obrigatória antes das providências
            </AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <p>
                O tipo ou o prazo desta intimação ainda precisa de revisão. A
                criação de providências e a geração de sugestões ficam
                bloqueadas até resolver essa pendência.
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

        <section
          aria-label="Publicação e destinatários"
          className="grid min-w-0 gap-4 border-b pb-4 xl:grid-cols-2 xl:gap-6"
        >
          <div className="min-w-0">
            <h2 className="mb-3 text-sm font-medium">Publicação</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Dado label="Disponibilização" value={m.disponibilizadoEm} />
              <Dado label="Publicação" value={m.publicadoEm} />
              <Dado
                label="Início informado da contagem"
                value={m.inicioContagem}
              />
            </dl>
          </div>
          <div className="min-w-0">
            <h2 className="mb-3 text-sm font-medium">
              Destinatários da publicação
            </h2>
            {m.destinatarios.length ? (
              <ul className="flex flex-col gap-2">
                {m.destinatarios.map((r, index) => (
                  <li
                    key={`${r.nome}:${r.oab}:${index}`}
                    className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                  >
                    <span className="min-w-0 break-words">{r.nome}</span>
                    {r.oab ? (
                      <span className="text-muted-foreground">OAB {r.oab}</span>
                    ) : null}
                    {r.matched ? (
                      <Badge variant="secondary">OAB monitorada</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Destinatários não informados na captura.
              </p>
            )}
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[min-content_1fr] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <Providencias det={det} />
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
            {det.prazoDetalhe &&
            precisaConfirmarPrazo(
              det.prazoDetalhe,
              det.intimacao?.estado ?? "",
            ) ? (
              <ConfirmacaoPrazo
                key={`${det.prazoDetalhe.id}:${det.prazoDetalhe.confirmed_at ?? "pending"}`}
                id={id}
                prazo={det.prazoDetalhe}
                estado={det.intimacao?.estado ?? ""}
              />
            ) : null}
            <PainelPrazo det={det} />
          </aside>
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
            <Card id="teor-intimacao" className="scroll-mt-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    <h2>Teor da intimação</h2>
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
              <CardContent>
                <TeorContent
                  content={m.teor}
                  emptyMessage={`Teor integral indisponível. ${m.documentoUrl ? "Consulte o documento de origem." : "Não há documento de origem disponível."}`}
                />
              </CardContent>
            </Card>
            <details className={DISCLOSURE}>
              <summary className={SUMMARY}>
                <span>
                  Histórico da intimação
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

function PainelPrazo({ det }: { det: Detalhe }) {
  const m = det.model!;
  const p = det.prazoDetalhe;
  const hasDate = !!m.fatalData;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Prazo e responsável</h2>
        </CardTitle>
        <CardDescription>
          {det.memoria?.origem?.label ??
            (det.intimacao?.estado === "a_classificar"
              ? "Classificação pendente"
              : "Intimação sem prazo definido")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="surface-inset p-4">
          <p className="text-muted-foreground text-xs">
            {hasDate && det.revisao.pendente
              ? "Vencimento registrado · sujeito à revisão"
              : "Vencimento"}
          </p>
          <p
            className="font-display mt-1 text-2xl leading-tight font-semibold tabular-nums"
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
          <p role="status" className="text-muted-foreground text-sm">
            Carregando situação do prazo…
          </p>
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

function Providencias({ det }: { det: Detalhe }) {
  const m = det.model!;
  return (
    <ProvidenciasSection
      processId={m.courtRecordId}
      intimationId={m.id}
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
    />
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
