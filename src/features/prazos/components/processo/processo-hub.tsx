"use client";

import { ChevronLeft, File } from "lucide-react";
import Link from "next/link";

import { useProcessoHub } from "../../hooks/use-processo-hub";
import { PrioIcon, StatusIcon } from "../icons";

// PROCESSO · HUB — cockpit do caso. Faixa de identidade (CNJ/cliente/tags + fatos
// + fase stepper) e 2 colunas: à esquerda intimações e prazos; à direita autos,
// peças, partes e andamentos. Componente = JSX + binding (regra do CLAUDE.md).
export function ProcessoHub({ numero }: { numero: string }) {
  const { isLoading, naoEncontrado, processo, voltarLabel, voltarHref } =
    useProcessoHub(numero);

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
            <div className="text-fg3 py-24 text-center text-[13px]">
              Carregando processo…
            </div>
          )}

          {naoEncontrado && (
            <div className="text-fg3 py-24 text-center text-[13px]">
              Processo não encontrado.
            </div>
          )}

          {processo && (
            <>
              {/* FAIXA DE IDENTIDADE */}
              <div className="border-line bg-panel overflow-hidden rounded-[14px] border">
                <div className="flex items-start gap-6 px-[22px] py-5">
                  <div className="min-w-0 flex-1">
                    <div className="text-fg3 font-mono text-xs">
                      {processo.cnj}
                    </div>
                    <h1 className="font-display mt-[5px] mb-[9px] text-[28px] leading-[1.1] font-medium tracking-[-0.01em]">
                      {processo.cliente}
                    </h1>
                    <div className="flex flex-wrap gap-1.5">
                      {processo.tags.map((t, i) => (
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
                        Valor
                      </div>
                      <div className="mt-[3px] font-mono text-[15px] font-medium">
                        {processo.valor}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Fase
                      </div>
                      <div className="mt-1 text-[13.5px] font-medium">
                        {processo.faseLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg3 text-[10px] tracking-[.04em] uppercase">
                        Ativas
                      </div>
                      <div
                        className="mt-1 text-[13.5px] font-medium"
                        style={{ color: "var(--gold)" }}
                      >
                        {processo.ativas} intimações
                      </div>
                    </div>
                    <div className="border-line2 col-span-full flex items-center gap-2 border-t pt-2.5">
                      <span className="border-line text-fg3 grid size-[22px] place-items-center rounded-full border text-[9px]">
                        {processo.respIniciais}
                      </span>
                      <span className="text-fg2 text-xs">
                        Responsável · {processo.responsavel}
                      </span>
                      <span className="text-fg3 ml-auto text-[11.5px]">
                        Distribuído {processo.distribuido}
                      </span>
                    </div>
                  </div>
                </div>
                {/* fase strip */}
                <div className="border-line2 bg-bg flex items-center border-t px-[22px] py-[14px]">
                  {processo.faseStepper.map((s, i) => (
                    <div key={i} className="flex flex-1 items-center">
                      <div className="flex flex-none items-center gap-[7px]">
                        <span
                          className="size-[11px] rounded-full"
                          style={{
                            border: `2px solid ${s.pontoCor}`,
                            background: s.preenche ? s.pontoCor : "transparent",
                          }}
                        />
                        <span
                          className="text-[11px]"
                          style={{
                            color: s.cor,
                            fontWeight: s.ativo ? 600 : 400,
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                      {s.temLinha && (
                        <span
                          className="mx-2.5 h-0.5 flex-1"
                          style={{ background: s.linhaCor }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CORPO EM 2 COLUNAS */}
              <div className="mt-5 grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start gap-5">
                {/* COLUNA PRIMÁRIA */}
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <span className="text-[13px] font-semibold">
                        Intimações deste processo
                      </span>
                      <span className="text-fg3 font-mono text-[11px]">
                        {processo.nIntim}
                      </span>
                    </div>
                    <div className="flex flex-col gap-[9px]">
                      {processo.intimacoes.map((i) => (
                        <button
                          key={i.id}
                          onClick={i.onOpen}
                          className="border-line bg-panel hover:bg-hover grid w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border px-[15px] py-[13px] text-left transition-colors"
                          style={{ borderLeft: `3px solid ${i.urgCor}` }}
                        >
                          <PrioIcon k={i.urgK} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {i.providencia}
                            </span>
                            <span className="text-fg3 mt-1 inline-flex items-center gap-[7px] text-[11.5px]">
                              <StatusIcon k={i.stageKey} size={14} />
                              {i.stageLabelTxt} · resp. {i.resp}
                            </span>
                          </span>
                          <span className="text-right">
                            <span
                              className="block font-mono text-[13px] font-medium"
                              style={{ color: i.urgCor }}
                            >
                              {i.prazoCurto}
                            </span>
                            <span className="text-fg3 mt-0.5 block text-[10.5px]">
                              fatal {i.fatal}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-4 py-3">
                      <span className="text-[12.5px] font-semibold">
                        Prazos em aberto
                      </span>
                      <span className="text-fg3 font-mono text-[11px]">
                        {processo.nPrazos}
                      </span>
                    </div>
                    {processo.prazos.map((p) => (
                      <div
                        key={p.id}
                        className="border-line2 hover:bg-hover flex items-center gap-2.5 border-b px-4 py-[11px] transition-colors"
                      >
                        <PrioIcon k={p.urgK} />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium">
                            {p.providencia}
                          </span>
                          <span className="text-fg3 mt-px block text-[11px]">
                            interno {p.interna} · fatal {p.fatal}
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

                {/* COLUNA SECUNDÁRIA */}
                <div className="flex flex-col gap-3.5">
                  {/* autos */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Autos
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {processo.nAutos} · {processo.autosFls}
                      </span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto">
                      {processo.autos.map((d, i) => (
                        <button
                          key={i}
                          onClick={d.onOpen}
                          className="border-line2 hover:bg-hover grid w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-[9px] border-b px-3.5 py-[9px] text-left transition-colors"
                        >
                          <File
                            className="size-[13px] flex-none"
                            strokeWidth={1.7}
                            style={{ color: d.fonteCor }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium">
                              {d.titulo}
                            </span>
                            <span className="text-fg3 block text-[10.5px]">
                              {d.tipo} · {d.fonteLabel}
                            </span>
                          </span>
                          <span className="text-fg3 font-mono text-[10px]">
                            fls. {d.fls}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* peças */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 flex items-center justify-between border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Peças
                      </span>
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {processo.nPecas}
                      </span>
                    </div>
                    {processo.pecas.map((pc, i) => (
                      <div
                        key={i}
                        className="border-line2 hover:bg-hover flex items-center gap-2.5 border-b px-3.5 py-[9px] transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {pc.titulo}
                          </span>
                          <span className="text-fg3 block text-[10.5px]">
                            {pc.data}
                          </span>
                        </span>
                        <span
                          className="flex-none rounded-full px-2 py-0.5 text-[9.5px] font-medium"
                          style={{
                            background: pc.statusFundo,
                            color: pc.statusCor,
                          }}
                        >
                          {pc.status}
                        </span>
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
                    {processo.partes.map((pt, i) => (
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
                        <div className="text-fg3 mt-px text-[10.5px]">
                          {pt.proc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* andamentos */}
                  <div className="border-line bg-panel overflow-hidden rounded-xl border">
                    <div className="border-line2 border-b px-3.5 py-[11px]">
                      <span className="text-fg2 text-[11px] font-semibold tracking-[.03em] uppercase">
                        Andamentos
                      </span>
                    </div>
                    <div className="px-3.5 pt-1 pb-2.5">
                      {processo.andamentos.map((a, i) => (
                        <div
                          key={i}
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
