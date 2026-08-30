"use client";

import { ChevronLeft, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";
import { OrigemIcon, PrioIcon, StatusIcon } from "../icons";

// Detalhe da intimação (unidade de trabalho), port do template 546-693. Faixa de
// identidade + stepper de ciclo de vida; 2 colunas: providências geradas por IA
// (sob demanda) à esquerda, "como a IA leu" + teor + trilha à direita.
export function IntimacaoDetalhe({ id }: { id: string }) {
  const det = useIntimacaoDetalhe(id);
  const m = det.model;

  if (!m) {
    return (
      <div className="text-fg3 flex flex-1 items-center justify-center text-[13px]">
        Intimação não encontrada.
      </div>
    );
  }

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-8 pt-4 pb-10">
          <div className="mb-3.5 flex items-center gap-2">
            <Link
              href="/"
              className="navi text-fg2 hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2} />
              Inbox
            </Link>
            <span className="text-fg3">·</span>
            <Link
              href={`/processos/${encodeURIComponent(m.cnj)}`}
              className="navi text-primary hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <FileText className="size-3.5" strokeWidth={1.8} />
              {m.procCliente} · {m.procCnj}
            </Link>
          </div>

          {/* faixa de identidade */}
          <div className="border-line bg-panel overflow-hidden rounded-[14px] border">
            <div className="flex items-start gap-6 px-[22px] py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-medium"
                    style={{ background: m.urgFundo, color: m.urgCor }}
                  >
                    <PrioIcon k={m.urgK} size={12} />
                    {m.urgLabel}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                    style={{ background: m.origemFundo, color: m.origemCor }}
                  >
                    <OrigemIcon origem={m.origem} cor={m.origemCor} />
                    {m.origemLabel}
                  </span>
                  <span className="text-fg3 text-[11.5px]">{m.orgao}</span>
                </div>
                <h1 className="font-display mt-2.5 text-[27px] leading-[1.1] tracking-[-0.01em]">
                  {m.providencia}
                </h1>
              </div>
              <div className="border-line2 flex shrink-0 items-baseline gap-2.5 border-l pl-[22px]">
                <span
                  className="text-[40px] leading-none font-semibold tabular-nums"
                  style={{ color: m.urgCor }}
                >
                  {m.faltamNum}
                </span>
                <span className="text-fg3 text-[12px] leading-[1.5]">
                  {m.faltamFrase}
                  <br />
                  interno{" "}
                  <strong className="text-foreground font-medium">
                    {m.interna}
                  </strong>{" "}
                  · fatal{" "}
                  <strong className="text-foreground font-medium">
                    {m.fatal}
                  </strong>
                </span>
              </div>
            </div>
            {/* stepper */}
            <div className="border-line2 bg-bg flex items-center border-t px-[22px] py-3.5">
              {m.stepper.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center"
                  style={{ flex: s.flex }}
                >
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusIcon k={s.key} size={14} />
                    <span
                      className="text-[10.5px] leading-[1.2]"
                      style={{ color: s.cor }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {s.temLinha ? (
                    <span
                      className="mx-2 h-0.5 flex-1"
                      style={{ background: s.linhaCor }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* 2 colunas */}
          <div className="mt-5 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start gap-5">
            {/* providências */}
            <div className="border-line bg-panel overflow-hidden rounded-xl border">
              <div className="border-line2 flex items-center gap-2 border-b px-4 pt-3.5 pb-3">
                <Sparkles
                  className="text-primary size-[15px]"
                  strokeWidth={1.8}
                />
                <span className="text-[13px] font-semibold">Providências</span>
                {det.provPronta ? (
                  <>
                    <span className="text-fg3 text-[11.5px]">
                      geradas pela IA · revise antes de executar
                    </span>
                    <span className="text-fg3 ml-auto font-mono text-[11px]">
                      {m.nProvs}
                    </span>
                  </>
                ) : null}
              </div>

              {det.provIdle ? (
                <div className="px-[22px] py-[26px] text-center">
                  <div className="bg-selected mx-auto mb-3 grid size-10 place-items-center rounded-[10px]">
                    <Sparkles
                      className="text-primary size-5"
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="font-display mb-1.5 text-[16px]">
                    Gerar providências com IA
                  </div>
                  <p className="text-fg3 mx-auto mb-4 max-w-[330px] text-[12px] leading-[1.55]">
                    A IA lê o teor, classifica o ato, deriva o prazo e sugere as
                    providências. A geração é sob demanda para controlar custo.
                  </p>
                  <button
                    onClick={det.gerar}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-medium"
                  >
                    <Sparkles className="size-[15px]" strokeWidth={1.8} />
                    Gerar providências
                  </button>
                  <div className="text-fg3 mt-2.5 text-[10.5px]">
                    Consome 1 crédito de análise · ~15s
                  </div>
                </div>
              ) : null}

              {det.provGerando ? (
                <div className="px-[22px] py-8 text-center">
                  <div className="border-line border-t-primary spin mx-auto mb-3.5 size-[26px] rounded-full border-[2.5px]" />
                  <div className="text-[13px] font-medium">
                    Lendo o teor e derivando providências…
                  </div>
                  <p className="text-fg3 mt-1.5 text-[11.5px]">
                    Classificando o ato e calculando o prazo.
                  </p>
                </div>
              ) : null}

              {det.provPronta ? (
                <>
                  <div className="border-line2 border-b px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white"
                        style={{ background: m.derivacao.atoCor }}
                      >
                        1 · Ato: {m.derivacao.ato}
                      </span>
                      <span className="text-fg3">›</span>
                      <span className="bg-hover text-fg2 rounded-full px-2.5 py-1">
                        2 · Prazo: {m.derivacao.prazoBase}
                      </span>
                      <span className="text-fg3">›</span>
                      <span className="bg-hover text-fg2 rounded-full px-2.5 py-1">
                        3 · Providências
                      </span>
                    </div>
                    <div className="text-fg3 mt-2 text-[11px]">
                      {m.derivacao.regra} · {m.derivacao.termo}
                    </div>
                  </div>
                  {m.provs.map((pv) => (
                    <div
                      key={pv.txt}
                      className="border-line2 hover:bg-hover grid grid-cols-[18px_1fr_auto] items-start gap-2.5 border-b px-4 py-3"
                    >
                      <span className="border-line bg-panel mt-px size-[17px] rounded-[5px] border" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium">
                          {pv.txt}
                        </span>
                        <span className="text-fg3 mt-[3px] block text-[11.5px] leading-[1.45]">
                          {pv.fonte}
                        </span>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium"
                        style={{ background: pv.tipoFundo, color: pv.tipoCor }}
                      >
                        {pv.tipo}
                      </span>
                    </div>
                  ))}
                  <div className="bg-bg flex items-center gap-3 px-4 py-3.5">
                    <FileText
                      className="text-fg3 size-[17px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium">
                        {m.pecaTitulo}
                      </span>
                      <span className="text-fg3 block text-[11px]">
                        {m.pecaStatus}
                      </span>
                    </span>
                    <button
                      onClick={det.gerarPeca}
                      className="border-line bg-panel text-foreground hover:bg-hover shrink-0 rounded-[7px] border px-3 py-1.5 text-[12px] font-medium"
                    >
                      Abrir editor
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* contexto */}
            <div className="flex flex-col gap-3.5">
              <div
                className="rounded-xl border p-[14px_16px]"
                style={{
                  borderColor:
                    "color-mix(in oklch, var(--primary) 26%, transparent)",
                  background:
                    "color-mix(in oklch, var(--primary) 5%, transparent)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Como a IA leu
                  </span>
                  <span className="text-fg3 ml-auto font-mono text-[10.5px]">
                    {m.derivacao.atoConf}
                  </span>
                </div>
                <div className="font-display mt-2 mb-1 text-[16px]">
                  {m.derivacao.ato}
                </div>
                <p className="text-fg2 text-[11.5px] leading-[1.5]">
                  A IA leu o teor, classificou o ato e derivou o prazo e as
                  providências. Confirme o tipo antes de validar.
                </p>
              </div>

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Teor da intimação
                  </span>
                </div>
                <p className="text-fg2 px-3.5 py-3 text-[12.5px] leading-[1.6]">
                  {m.teor}
                </p>
              </div>

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Trilha
                  </span>
                </div>
                <div className="px-3.5 pt-1 pb-2.5">
                  {m.timeline.map((t, i) => (
                    <div
                      key={i}
                      className="border-line2 grid grid-cols-[58px_1fr] gap-2.5 border-t py-[7px] first:border-t-0"
                    >
                      <span className="text-fg3 font-mono text-[10.5px]">
                        {t.data}
                      </span>
                      <span
                        className="text-[11.5px]"
                        style={{ color: t.done ? "var(--fg2)" : "var(--fg)" }}
                      >
                        {t.texto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* rodapé de ações */}
      <div className="border-line bg-panel flex shrink-0 items-center gap-2 border-t px-8 py-3">
        <div className="mx-auto flex w-full max-w-[1080px] gap-2">
          <button
            onClick={det.confirmar}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-[13px] font-medium"
          >
            Confirmar prazo
          </button>
          <button
            onClick={det.ajustar}
            className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2.5 text-[13px]"
          >
            Ajustar
          </button>
          <button
            onClick={det.gerarPeca}
            className="border-line bg-panel text-foreground hover:bg-hover ml-auto rounded-lg border px-3.5 py-2.5 text-[13px] font-medium"
          >
            Gerar peça com IA
          </button>
        </div>
      </div>
    </div>
  );
}
