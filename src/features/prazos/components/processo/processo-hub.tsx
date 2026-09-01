"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronLeft, Circle, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useProcessoHub } from "../../hooks/use-processo-hub";

// Barrinhas de sinal de urgência (0 tranquilo → 3 vencido) ao lado dos cards de
// intimação/prazo, como no design. Três colunas de altura crescente; as acesas usam
// a cor de urgência, as apagadas ficam esmaecidas.
function SinalUrgencia({ nivel, cor }: { nivel: number; cor: string }) {
  const alturas = [5, 8, 11];
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {alturas.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{
            height: h,
            background: cor,
            opacity: i < nivel ? 1 : 0.22,
          }}
        />
      ))}
    </span>
  );
}

// PROCESSO · HUB — cockpit do caso ligado ao BACKEND REAL. Faixa de identidade
// (cliente/CNJ/tags + fatos-chave + responsável) e 2 colunas: à esquerda a ação
// (intimações e prazos); à direita a referência (AUTOS, PEÇAS, PARTES, ANDAMENTOS).
// Componente = JSX + binding (regra do CLAUDE.md): toda derivação mora no hook.
export function ProcessoHub({ numero }: { numero: string }) {
  const hub = useProcessoHub(numero);
  const {
    isLoading,
    isError,
    naoEncontrado,
    identity,
    stepper,
    salvarValor,
    salvandoManual,
    responsavel,
    members,
    assign,
    isAssigning,
    partes,
    partesPending,
    autos,
    pecas,
    andamentos,
    andamentosTotal,
    andamentosPending,
    andamentosHasMore,
    andamentosLoadingMore,
    andamentosLoadMore,
    intimacoes,
    prazos,
    referenciasPending,
    voltarLabel,
    voltarHref,
  } = hub;

  const [valorEditando, setValorEditando] = useState(false);
  const [valorInput, setValorInput] = useState("");
  // Andamentos: mostra 4 por padrão; "Ver mais" expande (e aí paginação normal segue).
  const [andamentosExpandido, setAndamentosExpandido] = useState(false);

  // Rótulo da fase atual = o passo "current" do stepper (ou "—" quando não há fase).
  const faseLabel = stepper.find((s) => s.estado === "current")?.label ?? "—";

  function abrirEdicaoValor() {
    setValorInput(identity?.valorRaw != null ? String(identity.valorRaw) : "");
    setValorEditando(true);
  }
  function confirmarValor() {
    const v = Number(valorInput.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(v) && v >= 0) salvarValor(v);
    setValorEditando(false);
  }

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
                    <h1 className="font-display mt-[5px] mb-[9px] text-[22px] leading-[1.15] font-medium tracking-[-0.01em]">
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
                  {/* fatos-chave, densos e horizontais (VALOR editável · FASE · ATIVAS) */}
                  <div className="border-line2 grid flex-none grid-cols-[repeat(3,auto)] gap-x-[26px] gap-y-3 border-l pl-6">
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Valor
                      </div>
                      {valorEditando ? (
                        <input
                          autoFocus
                          value={valorInput}
                          onChange={(e) => setValorInput(e.target.value)}
                          onBlur={confirmarValor}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmarValor();
                            if (e.key === "Escape") setValorEditando(false);
                          }}
                          placeholder="0,00"
                          className="border-line bg-bg text-foreground mt-1 w-[120px] rounded-md border px-1.5 py-0.5 text-[13px] font-normal outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={abrirEdicaoValor}
                          disabled={salvandoManual}
                          className="hover:bg-hover mt-1 -ml-1 block rounded-md px-1 text-[13px] font-normal disabled:opacity-60"
                          style={{
                            color: identity.valor ? undefined : "var(--fg3)",
                          }}
                        >
                          {identity.valor ?? "Definir"}
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Fase
                      </div>
                      <div className="mt-1 text-[13px] font-normal">
                        {faseLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Ativas
                      </div>
                      <div
                        className="mt-1 text-[13px] font-normal"
                        style={{ color: "var(--primary)" }}
                      >
                        {intimacoes.length}{" "}
                        {intimacoes.length === 1 ? "intimação" : "intimações"}
                      </div>
                    </div>
                    <div className="border-line2 col-span-full flex items-center gap-2 border-t pt-2.5">
                      <span className="border-line text-fg3 grid size-[22px] place-items-center rounded-full border text-[9px]">
                        {responsavel.iniciais}
                      </span>
                      <Menu.Root>
                        <Menu.Trigger
                          disabled={isAssigning}
                          className="hover:bg-hover text-fg2 rounded-md px-1.5 py-0.5 text-xs disabled:opacity-60"
                        >
                          Responsável · {responsavel.nome}
                        </Menu.Trigger>
                        <Menu.Portal>
                          {/* Portaled: escapa o `overflow-hidden` da faixa de
                              identidade (senão o menu ficava cortado dentro do card)
                              e sobe pra z-50, acima de todo o conteúdo. */}
                          <Menu.Positioner
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className="z-50"
                          >
                            <Menu.Popup className="border-line bg-panel z-50 max-h-[240px] w-[240px] overflow-y-auto rounded-lg border py-1 shadow-lg outline-none">
                              <Menu.Item
                                onClick={() => assign(null)}
                                className="hover:bg-hover data-highlighted:bg-hover text-fg3 block w-full cursor-default px-3 py-1.5 text-left text-xs outline-none select-none"
                              >
                                Remover responsável
                              </Menu.Item>
                              {members.map((m) => (
                                <Menu.Item
                                  key={m.id}
                                  onClick={() => assign(m.id)}
                                  className="hover:bg-hover data-highlighted:bg-hover block w-full cursor-default px-3 py-1.5 text-left text-xs outline-none select-none"
                                >
                                  {m.label}
                                </Menu.Item>
                              ))}
                              {members.length === 0 && (
                                <div className="text-fg3 px-3 py-1.5 text-xs">
                                  Sem membros no escritório.
                                </div>
                              )}
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                      <span className="text-fg3 ml-auto text-[11.5px]">
                        Distribuído {identity.distribuido}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEPPER DE FASE — clicável (define o override manual) */}
              <div className="border-line bg-panel mt-2.5 flex items-center overflow-hidden rounded-[14px] border px-[22px] py-[13px]">
                {stepper.map((s, i) => (
                  <div
                    key={s.key}
                    className="flex items-center last:flex-none"
                    style={{ flex: i < stepper.length - 1 ? 1 : "none" }}
                  >
                    <button
                      type="button"
                      onClick={s.onClick}
                      disabled={salvandoManual}
                      className="hover:bg-hover flex flex-none items-center gap-2 rounded-md px-1.5 py-0.5 disabled:opacity-60"
                    >
                      <span
                        className="size-[12px] flex-none rounded-full"
                        style={{
                          borderWidth: s.estado === "current" ? 2 : 1.5,
                          borderStyle: "solid",
                          borderColor:
                            s.estado === "todo"
                              ? "var(--line)"
                              : "var(--primary)",
                          background:
                            s.estado === "done"
                              ? "var(--primary)"
                              : "transparent",
                        }}
                      />
                      <span
                        className="text-[11px] whitespace-nowrap"
                        style={{
                          color:
                            s.estado === "current"
                              ? "var(--primary)"
                              : s.estado === "done"
                                ? "var(--fg2)"
                                : "var(--fg3)",
                          fontWeight: s.estado === "current" ? 500 : 400,
                        }}
                      >
                        {s.label}
                      </span>
                    </button>
                    {i < stepper.length - 1 && (
                      <span
                        className="mx-2 h-px flex-1"
                        style={{ background: "var(--line2)" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* CORPO EM 2 COLUNAS */}
              <div className="mt-5 grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start gap-5">
                {/* COLUNA PRIMÁRIA — ação */}
                <div className="flex flex-col gap-5">
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
                        <Link
                          key={i.id}
                          href={`/intimacoes/${i.id}`}
                          className="border-line bg-panel hover:bg-hover grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border py-[13px] pr-[15px] pl-3 text-left transition-colors"
                          style={{ borderLeft: `3px solid ${i.urgCor}` }}
                        >
                          <SinalUrgencia nivel={i.urgNivel} cor={i.urgCor} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {i.titulo}
                            </span>
                            <span className="text-fg3 mt-1 flex items-center gap-1.5 text-[11.5px]">
                              <Circle className="size-[9px]" strokeWidth={2} />
                              {i.status}
                              {i.resp && (
                                <span className="text-fg3">
                                  · resp. {i.resp}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="text-right">
                            {i.prazoCurto && (
                              <span
                                className="block font-mono text-[13px] font-medium"
                                style={{ color: i.urgCor }}
                              >
                                {i.prazoCurto}
                              </span>
                            )}
                            {i.fatal && (
                              <span className="text-fg3 mt-0.5 block text-[11px]">
                                fatal {i.fatal}
                              </span>
                            )}
                          </span>
                        </Link>
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
                        className="border-line2 hover:bg-hover flex items-center gap-3 border-b px-4 py-[11px] transition-colors"
                      >
                        <SinalUrgencia nivel={p.urgNivel} cor={p.urgCor} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium">
                            {p.kind}
                          </span>
                          <span className="text-fg3 mt-px block text-[11px]">
                            {p.interno ? `interno ${p.interno} · ` : ""}fatal{" "}
                            {p.fatal}
                          </span>
                        </span>
                        <span
                          className="ml-auto font-mono text-[12px] font-medium"
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
                  {/* AUTOS */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[10px] font-medium tracking-[.02em] uppercase">
                        Autos
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {autos.total}
                        {autos.folhas > 0 ? ` · ${autos.folhas} fls.` : ""}
                      </span>
                    </div>
                    {autos.isPending && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Carregando autos…
                      </div>
                    )}
                    {!autos.isPending && autos.isEmpty && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Autos ainda não baixados.
                      </div>
                    )}
                    {!autos.isEmpty && (
                      <div className="max-h-[228px] overflow-y-auto">
                        {autos.itens.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => autos.abrir(a.id)}
                            title="Abrir documento"
                            className="border-line2 hover:bg-hover flex w-full items-center gap-2.5 border-b px-3.5 py-[9px] text-left transition-colors last:border-b-0"
                          >
                            <FileText
                              className="size-[14px] flex-none"
                              strokeWidth={1.6}
                              style={{ color: a.cor }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px]">
                                {a.titulo}
                              </span>
                              <span className="text-fg3 block text-[10.5px]">
                                {a.sub}
                                {a.processando ? " · processando…" : ""}
                              </span>
                            </span>
                            {a.fls && (
                              <span className="text-fg3 flex-none font-mono text-[10px]">
                                {a.fls}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PEÇAS */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[10px] font-medium tracking-[.02em] uppercase">
                        Peças
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {pecas.total}
                      </span>
                    </div>
                    {pecas.isPending && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Carregando peças…
                      </div>
                    )}
                    {!pecas.isPending && pecas.isEmpty && (
                      <div className="text-fg3 px-3.5 py-5 text-center text-[11px]">
                        Nenhuma peça neste processo.
                      </div>
                    )}
                    {pecas.itens.map((p) => (
                      <div
                        key={p.id}
                        className="border-line2 flex items-center gap-2.5 border-b px-3.5 py-[10px] last:border-b-0"
                      >
                        <FileText
                          className="size-[14px] flex-none"
                          strokeWidth={1.6}
                          style={{ color: p.cor }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px]">
                            {p.titulo}
                          </span>
                          <span className="text-fg3 block text-[10.5px]">
                            {p.sub} · {p.data}
                          </span>
                        </span>
                        <span
                          className="flex-none rounded-full px-2 py-[2px] text-[9.5px] font-medium"
                          style={{
                            background: p.statusFundo,
                            color: p.statusCor,
                          }}
                        >
                          {p.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* PARTES */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[10px] font-medium tracking-[.02em] uppercase">
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
                        className="border-line2 border-b px-3.5 py-[9px] last:border-b-0"
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

                  {/* ANDAMENTOS */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[10px] font-medium tracking-[.02em] uppercase">
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
                      {(andamentosExpandido
                        ? andamentos
                        : andamentos.slice(0, 4)
                      ).map((a) => (
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
                    {!andamentosExpandido && andamentos.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setAndamentosExpandido(true)}
                        className="border-line2 text-fg2 hover:bg-hover w-full border-t px-3.5 py-2 text-[11px]"
                      >
                        Ver mais ({andamentosTotal - 4})
                      </button>
                    )}
                    {andamentosExpandido && andamentosHasMore && (
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
