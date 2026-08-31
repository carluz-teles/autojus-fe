"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useProcessoHub } from "../../hooks/use-processo-hub";

// PROCESSO · HUB — cockpit do caso ligado ao BACKEND REAL. Faixa de identidade
// (CNJ/classe/tags + fatos-chave + responsável) e 2 colunas: à esquerda a ação
// (resumo IA, intimações e prazos); à direita a referência (tarefas, partes,
// andamentos). Componente = JSX + binding (regra do CLAUDE.md): toda derivação
// mora no hook useProcessoHub.
export function ProcessoHub({ numero }: { numero: string }) {
  const hub = useProcessoHub(numero);
  const {
    isLoading,
    isError,
    naoEncontrado,
    identity,
    responsavel,
    members,
    assign,
    isAssigning,
    resumo,
    partes,
    partesPending,
    andamentos,
    andamentosTotal,
    andamentosPending,
    andamentosHasMore,
    andamentosLoadingMore,
    andamentosLoadMore,
    intimacoes,
    prazos,
    tasks,
    referenciasPending,
    voltarLabel,
    voltarHref,
  } = hub;

  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="bg-bg flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1140px] px-8 pt-4 pb-12">
          <Link
            href={voltarHref}
            className="text-fg2 hover:bg-hover mb-[14px] -ml-[9px] inline-flex items-center gap-1.5 rounded-md px-[9px] py-[5px] text-xs"
          >
            <ChevronLeft className="size-[13px]" strokeWidth={2} />
            {voltarLabel}
          </Link>

          {isLoading && (
            <div className="flex flex-col gap-4">
              <div className="border-line bg-panel h-[168px] animate-pulse rounded-[14px] border" />
              <div className="mt-1 grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start gap-5">
                <div className="border-line bg-panel h-[220px] animate-pulse rounded-xl border" />
                <div className="border-line bg-panel h-[220px] animate-pulse rounded-xl border" />
              </div>
            </div>
          )}

          {isError && !isLoading && (
            <div className="text-fg3 py-24 text-center text-[13px]">
              Não foi possível carregar o processo. Tente novamente.
            </div>
          )}

          {naoEncontrado && (
            <div className="text-fg3 py-24 text-center text-[13px]">
              Processo não encontrado.
            </div>
          )}

          {identity && (
            <>
              {/* FAIXA DE IDENTIDADE */}
              <div className="border-line bg-panel overflow-hidden rounded-[14px] border">
                <div className="flex items-start gap-6 px-[22px] py-5">
                  <div className="min-w-0 flex-1">
                    <div className="text-fg3 font-mono text-xs">
                      {identity.cnj}
                    </div>
                    <h1 className="font-display mt-[5px] mb-[9px] text-[28px] leading-[1.1] font-medium tracking-[-0.01em]">
                      {identity.titulo}
                    </h1>
                    <div className="flex flex-wrap gap-1.5">
                      {identity.tags.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-md px-[9px] py-[3px] text-[11.5px]"
                          style={{ background: t.fundo, color: t.cor }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* fatos-chave, densos e horizontais */}
                  <div className="border-line2 grid flex-none grid-cols-[repeat(3,auto)] gap-x-[26px] gap-y-3 border-l pl-6">
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Grau
                      </div>
                      <div className="mt-1 text-[13.5px] font-medium">
                        {identity.degreeLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Situação
                      </div>
                      <div
                        className="mt-1 text-[13.5px] font-medium"
                        style={{ color: identity.lifecycleCor }}
                      >
                        {identity.lifecycleLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Órgão
                      </div>
                      <div className="mt-1 max-w-[180px] truncate text-[13.5px] font-medium">
                        {identity.judgingBody || "—"}
                      </div>
                    </div>
                    <div className="border-line2 relative col-span-full flex items-center gap-2 border-t pt-2.5">
                      <span className="border-line text-fg3 grid size-[22px] place-items-center rounded-full border text-[9px]">
                        {responsavel.iniciais}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMenuAberto((v) => !v)}
                        disabled={isAssigning}
                        className="hover:bg-hover text-fg2 rounded-md px-1.5 py-0.5 text-xs disabled:opacity-60"
                      >
                        Responsável · {responsavel.nome}
                      </button>
                      <span className="text-fg3 ml-auto text-[11.5px]">
                        Distribuído {identity.distribuido}
                      </span>
                      {menuAberto && (
                        <div className="border-line bg-panel absolute top-full left-0 z-10 mt-1 max-h-[240px] w-[240px] overflow-y-auto rounded-lg border py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              assign(null);
                              setMenuAberto(false);
                            }}
                            className="hover:bg-hover text-fg3 block w-full px-3 py-1.5 text-left text-xs"
                          >
                            Remover responsável
                          </button>
                          {members.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                assign(m.id);
                                setMenuAberto(false);
                              }}
                              className="hover:bg-hover block w-full px-3 py-1.5 text-left text-xs"
                            >
                              {m.name}
                            </button>
                          ))}
                          {members.length === 0 && (
                            <div className="text-fg3 px-3 py-1.5 text-xs">
                              Sem membros no escritório.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CORPO EM 2 COLUNAS */}
              <div className="mt-5 grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start gap-5">
                {/* COLUNA PRIMÁRIA — ação */}
                <div className="flex flex-col gap-4">
                  {/* Resumo IA */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-4 py-3">
                      <span className="text-[12.5px] font-semibold">
                        Resumo do processo
                      </span>
                      <span className="text-fg3 font-mono text-[11px]">IA</span>
                    </div>
                    <div className="px-4 py-3.5">
                      {resumo.isPending && (
                        <div className="text-fg3 py-3 text-center text-xs">
                          Gerando resumo…
                        </div>
                      )}
                      {!resumo.isPending && !resumo.disponivel && (
                        <div className="text-fg3 py-3 text-center text-xs">
                          Resumo indisponível.
                        </div>
                      )}
                      {!resumo.isPending && resumo.disponivel && (
                        <div className="flex flex-col gap-3.5">
                          {resumo.currentStatus && (
                            <div className="text-fg2 text-[12.5px] leading-relaxed">
                              <span className="text-fg3 mr-1.5 text-[10px] tracking-[.04em] uppercase">
                                Situação
                              </span>
                              {resumo.currentStatus}
                            </div>
                          )}
                          {resumo.summary && (
                            <p className="text-fg text-[13px] leading-[1.55]">
                              {resumo.summary}
                            </p>
                          )}
                          {resumo.keyDates.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                                Prazos-chave
                              </div>
                              {resumo.keyDates.map((k, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-[12px]"
                                >
                                  <span className="text-fg2 min-w-0 flex-1 truncate">
                                    {k.kind} · {k.end}
                                  </span>
                                  <span
                                    className="font-mono text-[11px]"
                                    style={{ color: k.cor }}
                                  >
                                    {k.daysLabel}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {resumo.risks.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                                Riscos
                              </div>
                              {resumo.risks.map((r, i) => (
                                <div
                                  key={i}
                                  className="text-[12px] leading-snug"
                                  style={{ color: "var(--red)" }}
                                >
                                  {r.descricao}
                                </div>
                              ))}
                            </div>
                          )}
                          {resumo.recommendedActions.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                                Ações recomendadas
                              </div>
                              {resumo.recommendedActions.map((a, i) => (
                                <div
                                  key={i}
                                  className="text-fg2 text-[12px] leading-snug"
                                >
                                  {a.acao}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Intimações do processo */}
                  <div>
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <span className="text-[13px] font-semibold">
                        Intimações deste processo
                      </span>
                      <span className="text-fg3 font-mono text-[11px]">
                        {intimacoes.length}
                      </span>
                    </div>
                    {referenciasPending && (
                      <div className="text-fg3 py-4 text-center text-xs">
                        Carregando intimações…
                      </div>
                    )}
                    {!referenciasPending && intimacoes.length === 0 && (
                      <div className="border-line text-fg3 rounded-[10px] border border-dashed px-4 py-6 text-center text-xs">
                        Nenhuma intimação neste processo.
                      </div>
                    )}
                    <div className="flex flex-col gap-[9px]">
                      {intimacoes.map((i) => (
                        <div
                          key={i.id}
                          className="border-line bg-panel grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border px-[15px] py-[13px] text-left"
                          style={{ borderLeft: `3px solid ${i.urgCor}` }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {i.titulo}
                            </span>
                            <span className="text-fg3 mt-1 block text-[11.5px]">
                              {i.meta}
                            </span>
                          </span>
                          {i.prazoCurto && (
                            <span
                              className="block font-mono text-[13px] font-medium"
                              style={{ color: i.urgCor }}
                            >
                              {i.prazoCurto}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prazos em aberto */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-4 py-3">
                      <span className="text-[12.5px] font-semibold">
                        Prazos em aberto
                      </span>
                      <span className="text-fg3 font-mono text-[11px]">
                        {prazos.length}
                      </span>
                    </div>
                    {!referenciasPending && prazos.length === 0 && (
                      <div className="text-fg3 px-4 py-6 text-center text-xs">
                        Sem prazos em aberto.
                      </div>
                    )}
                    {prazos.map((p) => (
                      <div
                        key={p.id}
                        className="border-line2 hover:bg-hover flex items-center gap-2.5 border-b px-4 py-[11px] transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium">
                            {p.kind}
                          </span>
                          <span className="text-fg3 mt-px block text-[11px]">
                            fatal {p.end}
                          </span>
                        </span>
                        <span
                          className="ml-auto font-mono text-[11px]"
                          style={{ color: p.urgCor }}
                        >
                          {p.prazoCurto}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUNA SECUNDÁRIA — referência */}
                <div className="flex flex-col gap-3.5">
                  {/* tarefas */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Tarefas
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {tasks.length}
                      </span>
                    </div>
                    {!referenciasPending && tasks.length === 0 && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Sem tarefas.
                      </div>
                    )}
                    {tasks.map((t) => (
                      <div
                        key={t.id}
                        className="border-line2 hover:bg-hover flex items-center gap-2.5 border-b px-3.5 py-[9px] transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {t.titulo}
                          </span>
                          <span className="text-fg3 block text-[10.5px]">
                            {t.due}
                          </span>
                        </span>
                        {t.status && (
                          <span className="text-fg3 flex-none text-[9.5px] font-medium">
                            {t.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* partes */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Partes
                      </span>
                    </div>
                    {!partesPending && partes.length === 0 && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Sem partes identificadas.
                      </div>
                    )}
                    {partes.map((pt, i) => (
                      <div
                        key={i}
                        className="border-line2 border-b px-3.5 py-[9px]"
                      >
                        <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                          {pt.papel}
                        </div>
                        <div className="mt-0.5 text-xs font-medium">
                          {pt.nome}
                        </div>
                        {pt.documento && (
                          <div className="text-fg3 mt-px font-mono text-[10px]">
                            {pt.documento}
                          </div>
                        )}
                        {pt.proc && (
                          <div className="text-fg3 mt-px text-[10.5px]">
                            {pt.proc}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* andamentos */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Andamentos
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {andamentosTotal}
                      </span>
                    </div>
                    <div className="px-3.5 pt-1 pb-2.5">
                      {andamentosPending && (
                        <div className="text-fg3 py-4 text-center text-[11px]">
                          Carregando…
                        </div>
                      )}
                      {!andamentosPending && andamentos.length === 0 && (
                        <div className="text-fg3 py-4 text-center text-[11px]">
                          Sem andamentos.
                        </div>
                      )}
                      {andamentos.map((a) => (
                        <div
                          key={a.id}
                          className="border-line2 grid grid-cols-[64px_1fr] gap-2.5 border-t py-[7px]"
                        >
                          <span className="text-fg3 font-mono text-[10.5px]">
                            {a.data}
                          </span>
                          <span className="text-fg2 text-[11.5px] leading-[1.45]">
                            {a.texto}
                          </span>
                        </div>
                      ))}
                    </div>
                    {andamentosHasMore && (
                      <button
                        type="button"
                        onClick={andamentosLoadMore}
                        disabled={andamentosLoadingMore}
                        className="border-line2 text-fg2 hover:bg-hover w-full border-t px-3.5 py-2 text-[11px] disabled:opacity-60"
                      >
                        {andamentosLoadingMore
                          ? "Carregando…"
                          : "Carregar mais"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
