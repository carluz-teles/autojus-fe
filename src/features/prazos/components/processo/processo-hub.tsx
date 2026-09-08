"use client";
import {
  ArrowRight,
  Copy,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useRef } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { TeorContent } from "@/components/teor-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessProvidencias } from "@/features/action-items/components/providencias-section";
import { SyncAutosButton } from "@/features/configuracoes/components/sync-autos-button";
import { PdfDrawer } from "@/features/documentos/components/pdf-drawer";
import { CourtAccessNotice } from "@/features/onboarding/components/court-access-notice";
import { Responsavel } from "@/features/organization/components/responsavel";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { ProcessoSituacao } from "@/features/processos/components/situacao-processo";
import { FASE_STEPS } from "@/features/processos/lib/apresentacao";
import type { ProcessoPhase } from "@/features/processos/types";
import { formatDate } from "@/lib/format";

import {
  type RegistroProcesso,
  useProcessoHub,
} from "../../hooks/use-processo-hub";

interface QueryState {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => unknown;
}

function Colecao({
  query,
  count,
  empty,
  children,
}: {
  query: QueryState;
  count: number;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {query.isPending && (
        <p
          role="status"
          className="text-muted-foreground flex items-center gap-2 py-10 text-sm"
        >
          <Loader2 className="size-4 animate-spin" /> Carregando registros…
        </p>
      )}
      {query.isError && (
        <div
          role="alert"
          className="bg-destructive/5 my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
        >
          <p>Não foi possível carregar os registros.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {!query.isPending &&
        !query.isError &&
        count === 0 &&
        (typeof empty === "string" ? (
          <p className="text-muted-foreground py-10 text-sm leading-relaxed">
            {empty}
          </p>
        ) : (
          empty
        ))}
      {children}
      {!query.isPending && (count > 0 || query.hasNextPage) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            {count} {count === 1 ? "registro exibido" : "registros exibidos"}
            {query.hasNextPage ? " · Há mais registros para consultar" : ""}
          </p>
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage?.()}
            >
              {query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function Registros({ items }: { items: RegistroProcesso[] }) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href || "#"}
          className="hover:bg-muted/50 focus-visible:ring-ring/50 -mx-2 flex flex-col gap-3 rounded-lg p-3 outline-none focus-visible:ring-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{item.titulo}</h3>
              <Badge variant={item.variant}>{item.status}</Badge>
            </div>
            {item.descricao && (
              <TeorContent
                content={item.descricao}
                allowLinks={false}
                className="text-muted-foreground mt-1 line-clamp-2 text-[13px] leading-relaxed"
              />
            )}
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {item.meta}
            </p>
            {item.responsavel && (
              <Responsavel
                className="mt-2"
                value={item.responsavel.id}
                nome={item.responsavel.nome}
              />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
            {item.prazo && (
              <div className="space-y-1 sm:text-right">
                <p className="text-sm font-medium tabular-nums">
                  {item.prazo.data}
                </p>
                <Badge variant={item.prazo.variant}>{item.prazo.label}</Badge>
              </div>
            )}
            <ArrowRight
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Fato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm leading-relaxed break-words">{children}</dd>
    </div>
  );
}

export function ProcessoHub({ numero }: { numero: string }) {
  const h = useProcessoHub(numero);
  const uploadInput = useRef<HTMLInputElement>(null);
  const p = h.processo;
  const identity = h.identity;
  return (
    <PageFrame
      header={
        <>
          <ShellBackLink href={h.voltarHref} label="Voltar para processos" />
          <h1 className="shrink-0 text-[13px] font-medium">Processo</h1>
          <span className="text-fg3 min-w-0 truncate font-mono text-[11px]">
            {identity?.cnj}
          </span>
        </>
      }
    >
      <div className="mx-auto max-w-[1320px] space-y-4 px-4 py-4">
        {h.processoQ.isPending && (
          <div
            role="status"
            aria-label="Carregando processo"
            className="bg-muted h-56 animate-pulse rounded-lg"
          />
        )}
        {h.processoQ.isError && (
          <div role="alert" className="bg-card space-y-4 rounded-xl border p-8">
            <p>Não foi possível carregar o processo.</p>
            <Button
              variant="outline"
              onClick={() => void h.processoQ.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {p && identity && (
          <>
            <section
              aria-label="Identificação do processo"
              className="border-line border-b pb-4"
            >
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div className="min-w-0 space-y-2">
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <span>PROCESSO</span>
                    <span aria-hidden="true">/</span>
                    <span>{identity.tribunal}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-mono text-sm tabular-nums sm:text-base">
                      {identity.cnj}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Copiar CNJ"
                      onClick={() => void h.copiarCNJ()}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <h2 className="max-w-3xl text-xl leading-tight font-medium tracking-tight break-words sm:text-[22px]">
                    {identity.title}
                  </h2>
                  {identity.partes && (
                    <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                      {identity.partes}
                    </p>
                  )}
                  <ProcessoSituacao situacao={identity.situacaoDetalhe} />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={h.abrirEdicao}>
                    <Pencil />
                    Editar dados
                  </Button>
                  <Button size="sm" onClick={h.verAutos}>
                    <FolderOpen />
                    Consultar autos
                  </Button>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-3">
                <Fato label="Classe processual">
                  {p.class || "Não informada"}
                </Fato>
                <Fato label="Órgão julgador">{identity.orgao}</Fato>
                <Fato label="Fase processual">
                  {identity.fase || "Não informada"}
                </Fato>
              </dl>
            </section>

            {identity.prazo && (
              <section
                aria-label="Prazo em atenção"
                className="bg-gold/5 border-gold/25 flex flex-col justify-between gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Prazo mais próximo em aberto
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums">
                      {identity.prazo.data}
                    </span>
                    <Badge variant={identity.prazo.variant}>
                      {identity.prazo.resumo}
                    </Badge>
                  </div>
                  <p className="text-sm">{identity.prazo.ato}</p>
                </div>
                <Button size="sm" variant="outline" onClick={h.irParaTrabalho}>
                  Conferir prazos
                  <ArrowRight />
                </Button>
              </section>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="border-line min-w-0 space-y-4 lg:border-l lg:pl-5">
                <section
                  id="processo-trabalho"
                  tabIndex={-1}
                  className="border-line scroll-mt-4 border-b pb-4 outline-none"
                  aria-labelledby="trabalho-title"
                >
                  <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h2 id="trabalho-title" className="text-sm font-medium">
                        Trabalho do escritório
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Revise intimações, confira prazos e acompanhe
                        providências.
                      </p>
                    </div>
                    <NativeSelect
                      size="sm"
                      aria-label="Exibir registros de trabalho"
                      value={h.historico ? "todos" : "pendentes"}
                      onChange={(e) =>
                        h.setHistorico(e.target.value === "todos")
                      }
                      className="shrink-0"
                    >
                      <option value="pendentes">Pendências</option>
                      <option value="todos">Todos, incluindo encerrados</option>
                    </NativeSelect>
                  </div>
                  <Tabs
                    defaultValue="intimacoes"
                    value={h.trabalhoTab}
                    onValueChange={h.setTrabalhoTab}
                  >
                    <div className="mb-4 overflow-x-auto pb-1">
                      <TabsList aria-label="Trabalho do processo">
                        <TabsTrigger value="intimacoes">Intimações</TabsTrigger>
                        <TabsTrigger value="prazos">Prazos</TabsTrigger>
                        <TabsTrigger value="providencias">
                          Providências
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent className="animate-none" value="intimacoes">
                      <Colecao
                        query={h.intQ}
                        count={h.intimacoes.length}
                        empty={
                          h.historico
                            ? "Nenhuma intimação vinculada a este processo."
                            : "Nenhuma intimação pendente entre os registros carregados. Consulte Todos para ver o histórico."
                        }
                      >
                        <Registros items={h.intimacoes} />
                      </Colecao>
                    </TabsContent>
                    <TabsContent className="animate-none" value="prazos">
                      <Colecao
                        query={h.prazoQ}
                        count={h.prazos.length}
                        empty={
                          h.historico
                            ? "Nenhum prazo vinculado a este processo."
                            : "Nenhum prazo em aberto entre os registros carregados. Consulte Todos para ver os encerrados."
                        }
                      >
                        <Registros items={h.prazos} />
                      </Colecao>
                    </TabsContent>
                    <TabsContent className="animate-none" value="providencias">
                      <ProcessProvidencias
                        processId={numero}
                        history={h.historico}
                      />
                    </TabsContent>
                  </Tabs>
                </section>

                <section
                  id="processo-acervo"
                  tabIndex={-1}
                  className="border-line scroll-mt-4 border-b pb-4 outline-none"
                  aria-labelledby="acervo-title"
                >
                  <div className="mb-3">
                    <h2 id="acervo-title" className="text-sm font-medium">
                      Documentos e histórico
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Consulte as fontes e o histórico deste processo.
                    </p>
                  </div>
                  <Tabs
                    defaultValue="autos"
                    value={h.acervoTab}
                    onValueChange={h.setAcervoTab}
                  >
                    <div className="mb-4 overflow-x-auto pb-1">
                      <TabsList aria-label="Acervo do processo">
                        <TabsTrigger value="autos">Autos</TabsTrigger>
                        <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
                        <TabsTrigger value="pecas">Peças</TabsTrigger>
                        <TabsTrigger value="partes">Partes</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      className="flex animate-none flex-col gap-4"
                      value="autos"
                    >
                      <CourtAccessNotice
                        court={h.processo?.court}
                        degree={h.processo?.degree}
                      />
                      <SyncAutosButton
                        court={h.processo?.court}
                        courtRecordId={h.processo?.id}
                        degree={h.processo?.degree}
                        description="Consulte os autos sem sair do processo."
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={h.autos.upload.isUploading}
                          onClick={() => uploadInput.current?.click()}
                        >
                          <Upload data-icon="inline-start" aria-hidden />
                          {h.autos.upload.isUploading
                            ? "Enviando…"
                            : "Adicionar PDF"}
                        </Button>
                      </SyncAutosButton>
                      <input
                        ref={uploadInput}
                        type="file"
                        accept="application/pdf,.pdf"
                        aria-label="Adicionar PDF aos autos"
                        disabled={h.autos.upload.isUploading}
                        className="hidden"
                        onChange={(e) => {
                          h.enviarDocumento(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      {(h.uploadError || h.autos.upload.uploadError) && (
                        <p
                          role="alert"
                          className="text-destructive pb-3 text-sm"
                        >
                          {h.uploadError ||
                            "Não foi possível enviar o PDF. Tente selecionar o arquivo novamente."}
                        </p>
                      )}
                      {h.autos.upload.isUploading && (
                        <p
                          role="status"
                          className="text-muted-foreground pb-3 text-sm"
                        >
                          Enviando documento
                          {h.autos.upload.progress !== null
                            ? ` · ${h.autos.upload.progress}%`
                            : ""}
                          …
                        </p>
                      )}
                      <Colecao
                        query={h.autos}
                        count={h.docs.length}
                        empty={
                          <EmptyState
                            icon={FolderOpen}
                            title="Os autos ainda não estão disponíveis"
                            description="Sincronize com o tribunal ou adicione um PDF do escritório para consultar os documentos aqui."
                            className="bg-card"
                          />
                        }
                      >
                        <div className="divide-y">
                          {h.docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                            >
                              <div className="bg-primary/10 text-primary hidden size-10 shrink-0 place-items-center rounded-lg sm:grid">
                                <FileText className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium break-words">
                                  {doc.titulo}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                  {doc.meta}
                                </p>
                                <Badge className="mt-2" variant={doc.variant}>
                                  {doc.status}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                disabled={
                                  !doc.podeAbrir ||
                                  (!doc.visualizavel &&
                                    h.autos.baixar.isPending)
                                }
                                onClick={() =>
                                  doc.visualizavel
                                    ? h.abrirDocumento(doc)
                                    : h.autos.baixar.mutate(doc.id)
                                }
                                aria-label={`${doc.visualizavel ? "Abrir" : "Baixar"} ${doc.titulo}`}
                              >
                                {doc.visualizavel
                                  ? "Abrir documento"
                                  : "Baixar arquivo"}
                                <ArrowRight />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Colecao>
                    </TabsContent>
                    <TabsContent className="animate-none" value="andamentos">
                      <Colecao
                        query={h.andQ}
                        count={h.andQ.andamentos.length}
                        empty="Nenhum andamento disponível na fonte consultada."
                      >
                        <ol className="divide-y">
                          {h.andQ.andamentos.map((a) => (
                            <li
                              key={a.id}
                              className="flex flex-col gap-2 py-4 sm:flex-row sm:gap-5"
                            >
                              <time
                                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                                dateTime={a.occurred_at}
                              >
                                {formatDate(a.occurred_at)}
                              </time>
                              <p className="text-sm leading-relaxed">
                                {a.text}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </Colecao>
                    </TabsContent>
                    <TabsContent className="animate-none" value="pecas">
                      <Colecao
                        query={h.pecasQ}
                        count={h.pecas.length}
                        empty="Nenhuma peça vinculada. Abra uma intimação ou providência para iniciar a elaboração com o contexto do processo."
                      >
                        <Registros items={h.pecas} />
                      </Colecao>
                    </TabsContent>
                    <TabsContent className="animate-none" value="partes">
                      <Colecao
                        query={h.partesQ}
                        count={h.partes.length}
                        empty="As partes ainda não foram identificadas nos dados consultados."
                      >
                        <div className="divide-y">
                          {h.partes.map((parte) => (
                            <div key={parte.key} className="space-y-2 py-4">
                              <Badge variant="secondary">{parte.papel}</Badge>
                              <p className="text-sm font-medium">
                                {parte.name}
                              </p>
                              {parte.document && (
                                <p className="text-muted-foreground text-xs">
                                  CPF/CNPJ: {parte.document}
                                </p>
                              )}
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {parte.counsels.length
                                  ? parte.counsels
                                      .map(
                                        (c) =>
                                          `${c.name}${c.oab ? ` · OAB/${c.uf} ${c.oab}` : ""}`,
                                      )
                                      .join("; ")
                                  : "Advogados não informados"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Colecao>
                    </TabsContent>
                  </Tabs>
                </section>
              </div>

              <aside
                className="border-line min-w-0 space-y-4 lg:border-l lg:pl-5"
                aria-label="Informações do processo"
              >
                <section className="border-line space-y-4 border-b pb-4">
                  <h2 className="text-sm font-medium">Ficha do processo</h2>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      Responsável no escritório
                    </p>
                    <ResponsavelMenu
                      label="Responsável pelo processo"
                      value={p.assigned_user_id}
                      nome={h.responsavel}
                      membros={h.members}
                      emVoo={h.assigning}
                      onAssign={h.assign}
                    />
                  </div>
                  <dl className="space-y-3 border-t pt-3">
                    <Fato label="Assunto">{p.subject || "Não informado"}</Fato>
                    <Fato label="Distribuição">{h.distribuido}</Fato>
                    <Fato label="Valor da causa">{h.valorFormatado}</Fato>
                    <Fato label="Publicidade">{h.segredo}</Fato>
                  </dl>
                </section>
                <section className="space-y-3">
                  <h2 className="text-sm font-medium">
                    Último andamento conhecido
                  </h2>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {identity.movimentoData}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {identity.movimento}
                  </p>
                  <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                    A situação do processo é inferida dos dados disponíveis.
                    Prazos e providências são acompanhados separadamente.
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
      <PdfDrawer doc={h.documento} onClose={h.fecharDocumento} />
      <Sheet open={h.editando} onOpenChange={h.setEditando}>
        <SheetContent
          title="Editar dados do processo"
          description="Organize a identificação e os dados usados pelo escritório."
          footer={
            <>
              <Button
                variant="outline"
                disabled={h.salvando}
                onClick={() => h.setEditando(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="editar-processo"
                disabled={h.salvando}
              >
                {h.salvando ? "Salvando…" : "Salvar alterações"}
              </Button>
            </>
          }
        >
          <form
            id="editar-processo"
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void h.salvar();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="processo-label" className="text-sm font-medium">
                Título do processo
              </label>
              <Input
                id="processo-label"
                value={h.label}
                onChange={(e) => h.setLabel(e.target.value)}
                placeholder={identity?.title}
                maxLength={200}
              />
              <p className="text-muted-foreground text-xs">
                Deixe vazio para usar o título gerado pelos dados do processo.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="processo-phase" className="text-sm font-medium">
                Fase processual
              </label>
              <NativeSelect
                id="processo-phase"
                className="w-full"
                value={h.phase}
                onChange={(e) =>
                  h.setPhase(e.target.value as ProcessoPhase | "")
                }
              >
                <option value="" disabled>
                  Não informada
                </option>
                {FASE_STEPS.map((s) => (
                  <option value={s.key} key={s.key}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-muted-foreground text-xs">
                O ajuste manual passa a prevalecer na fase exibida.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="processo-valor" className="text-sm font-medium">
                Valor da causa (R$)
              </label>
              <Input
                id="processo-valor"
                inputMode="decimal"
                value={h.valor}
                onChange={(e) => h.setValor(e.target.value)}
                placeholder="Ex.: 1.500,00"
              />
            </div>
            {h.formError && (
              <p role="alert" className="text-destructive text-sm">
                {h.formError}
              </p>
            )}
          </form>
        </SheetContent>
      </Sheet>
    </PageFrame>
  );
}
