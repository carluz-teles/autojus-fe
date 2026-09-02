"use client";

import { Menu } from "@base-ui/react/menu";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { Avatar } from "@/components/mock-ui/data-display";
import { Input } from "@/components/ui/input";
import {
  AnalisarLoading,
  ComoIALeuCard,
  ProvidenciaRow,
  ProvidenciasBanner,
  ProvidenciasLinhaLegal,
} from "@/features/intimacoes/components/shared/analisar-card";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { cn } from "@/lib/utils";

import {
  type MemoriaCalculoVM,
  useIntimacaoDetalhe,
} from "../../hooks/use-intimacao-detalhe";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-72 min-w-48 origin-(--transform-origin) overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50";

// Detalhe da intimação (unidade de trabalho), ligado ao backend real via
// useIntimacaoDetalhe. Faixa de identidade + stepper de ciclo de vida + ação
// rápida (responsável); 2 colunas: providências geradas por IA (sob demanda)
// à esquerda, teor + trilha à direita.
export function IntimacaoDetalhe({ id }: { id: string }) {
  const det = useIntimacaoDetalhe(id);
  const m = det.model;

  if (det.isPending) {
    return (
      <div className="text-fg3 flex flex-1 items-center justify-center text-[13px]">
        Carregando intimação…
      </div>
    );
  }

  if (det.isError || !m) {
    return (
      <div
        className="text-fg3 flex flex-1 items-center justify-center text-[13px]"
        role="alert"
      >
        Não foi possível carregar esta intimação.
      </div>
    );
  }

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-8 pt-4 pb-10">
          <div className="mb-3.5 flex items-center gap-2">
            <Link
              href="/intimacoes"
              className="navi text-fg2 hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <ChevronLeft className="size-3.5" strokeWidth={2} />
              Intimações
            </Link>
            <span className="text-fg3">·</span>
            <Link
              href={`/processos/${encodeURIComponent(m.courtRecordId)}`}
              className="navi text-primary hover:bg-hover inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px]"
            >
              <FileText className="size-3.5" strokeWidth={1.8} />
              {m.cnj}
            </Link>
          </div>

          {/* faixa de identidade */}
          <div className="border-line bg-panel overflow-hidden rounded-[14px] border">
            <div className="flex items-start gap-6 px-[22px] py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {m.urgencia ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                      style={{
                        background: m.urgencia.fundo,
                        color: m.urgencia.cor,
                      }}
                    >
                      {m.urgencia.label}
                    </span>
                  ) : null}
                  {/* origem + selo — dimensões do motor de prazos (memória de
                      cálculo). Só aparecem quando há prazo derivado. */}
                  {det.memoria?.origem ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                      style={{
                        background: det.memoria.origem.fundo,
                        color: det.memoria.origem.cor,
                      }}
                      title="Origem — de onde veio a data"
                      aria-label={`Origem da data: ${det.memoria.origem.label}`}
                    >
                      {det.memoria.origem.label}
                    </span>
                  ) : null}
                  {det.memoria?.selo ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-[9px] py-[3px] text-[11px] font-medium"
                      style={{
                        borderColor: det.memoria.selo.cor,
                        color: det.memoria.selo.cor,
                        background: det.memoria.selo.fundo,
                      }}
                      title={det.memoria.selo.descricao}
                      aria-label={`Selo de confiança: ${det.memoria.selo.label} — ${det.memoria.selo.descricao}`}
                    >
                      {det.memoria.selo.label}
                    </span>
                  ) : null}
                  <span className="text-fg3 text-[11.5px]">{m.orgao}</span>
                </div>
                <h1 className="font-display mt-2.5 text-[27px] leading-[1.1] tracking-[-0.01em]">
                  {m.titulo}
                </h1>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-fg3 text-[12px]">
                    publicado em {m.publicadoEm}
                  </p>
                </div>
              </div>
              <div className="border-line2 flex shrink-0 flex-col items-start gap-2 border-l pl-[22px]">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className="text-[40px] leading-none font-semibold tabular-nums"
                    style={{ color: m.prazoCor }}
                  >
                    {m.prazoNum}
                  </span>
                  <span className="text-fg3 text-[12px] leading-[1.5]">
                    {m.prazoFrase}
                    {m.fatalData ? (
                      <>
                        <br />
                        fatal{" "}
                        <strong className="text-foreground font-medium">
                          {m.fatalData}
                        </strong>
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-fg3 text-[12px]">Responsável:</span>
                  <ResponsavelMenu
                    value={m.responsavelId}
                    nome={m.responsavelNome}
                    membros={det.membros}
                    emVoo={det.assignEmVoo}
                    onAssign={det.onAssign}
                  />
                </div>
              </div>
            </div>
            {/* stepper do ciclo de trabalho (recebida → protocolado) */}
            <div className="border-line2 bg-bg flex items-center border-t px-[22px] py-3.5">
              {m.stepper.map((s) => {
                const cor =
                  s.estado === "todo" ? "var(--fg3)" : "var(--foreground)";
                return (
                  <div
                    key={s.key}
                    className="flex items-center"
                    style={{ flex: s.flex }}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <StepMarcador estado={s.estado} />
                      <span
                        className="text-[10.5px] leading-[1.2]"
                        style={{
                          color: cor,
                          fontWeight: s.estado === "current" ? 500 : 400,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {s.temLinha ? (
                      <span
                        className="mx-2 h-0.5 flex-1"
                        style={{
                          background: s.linhaFeita
                            ? "var(--primary)"
                            : "var(--line)",
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* memória de cálculo ("por que essa data?") */}
          <MemoriaCalculoCard
            memoria={det.memoria}
            pending={det.memoriaPending}
            erro={det.memoriaErro}
            emVoo={det.memoriaEmVoo}
            onAceitarDeclarado={det.onAceitarDeclarado}
            onAceitarCalculado={det.onAceitarCalculado}
            onAjusteManual={det.onAjusteManual}
            onConfirmarTipo={det.onConfirmarTipo}
            onReclassificarTipo={det.onReclassificarTipo}
          />

          {/* 2 colunas */}
          <div className="mt-5 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start gap-5">
            {/* PRIMÁRIA: providências (sob demanda) */}
            <div className="border-line bg-panel overflow-hidden rounded-xl border">
              <div className="border-line2 flex items-center gap-2 border-b px-4 pt-3.5 pb-3">
                <Sparkles
                  className="text-primary size-[15px]"
                  strokeWidth={1.8}
                />
                <span className="text-[13px] font-semibold">Providências</span>
                {m.analisada && !m.degradado ? (
                  <>
                    <span className="text-fg3 text-[11.5px]">
                      geradas pela IA · revise antes de executar
                    </span>
                    <span className="text-fg3 ml-auto font-mono text-[11px]">
                      {m.nProvidencias}
                    </span>
                  </>
                ) : null}
              </div>

              {det.analisando ? <AnalisarLoading /> : null}

              {!det.analisando && !m.analisada ? (
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
                  {det.analiseErro ? (
                    <p
                      role="alert"
                      className="text-destructive mb-3 text-[12px]"
                    >
                      Não foi possível gerar a análise. Tente novamente.
                    </p>
                  ) : null}
                  <button
                    onClick={det.onAnalisar}
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

              {!det.analisando && m.analisada ? (
                <>
                  {m.degradado ? (
                    <p
                      role="alert"
                      className="text-fg3 px-4 py-6 text-[12.5px] leading-[1.6]"
                    >
                      Análise indisponível no momento. Tente gerar novamente.
                    </p>
                  ) : m.providencias.length === 0 ? (
                    <p className="text-fg3 px-4 py-6 text-[12.5px] leading-[1.6]">
                      Nenhuma providência sugerida para esta intimação.
                    </p>
                  ) : (
                    <>
                      {/* Linha de detalhe legal (SEM breadcrumb — removido por
                          decisão explícita, v2.1) + o banner "Cada providência
                          vira uma tarefa…" + "Criar todas" —
                          docs/design-card-providencias-v2.md §2-3
                          (compartilhados com <AnalisarCard/>, Regra nº1). */}
                      <ProvidenciasLinhaLegal intimacao={det.intimacao!} />
                      <ProvidenciasBanner
                        intimacao={det.intimacao!}
                        itens={m.providencias}
                      />
                      <ul>
                        {m.providencias.map((p) => (
                          <ProvidenciaRow
                            key={p.id}
                            intimacaoId={m.id}
                            providencia={p}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="border-line2 text-fg3 flex items-center justify-between gap-3 border-t px-4 py-3 text-[11.5px]">
                    <span>Gerado em {m.analisadaEm}</span>
                    <button
                      onClick={det.onAnalisar}
                      className="navi text-fg2 hover:bg-hover rounded-md px-2 py-1 text-[11.5px] font-medium"
                    >
                      Gerar novamente
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* SECUNDÁRIA: como a IA leu (= card "Análise" fundido, v2.1) +
                teor + trilha */}
            <div className="flex flex-col gap-3.5">
              {m.analisada && !m.degradado && m.providencias.length > 0 ? (
                <ComoIALeuCard
                  ato={m.ato}
                  resumo={m.resumo}
                  itens={m.providencias}
                />
              ) : null}

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Teor da intimação
                  </span>
                </div>
                {m.teor ? (
                  // O teor vem em HTML (DJEN). sanitizeContentHtml remove
                  // scripts/handlers/URIs perigosas antes de renderizar — sem
                  // isso apareciam as tags cruas (<html><head>…).
                  <div
                    className="prose-intimacao text-fg2 px-3.5 py-3 text-[12.5px] leading-[1.6]"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeContentHtml(m.teor),
                    }}
                  />
                ) : (
                  <p className="text-fg3 px-3.5 py-3 text-[12.5px] leading-[1.6]">
                    Teor integral indisponível — publicação capturada do DJEN.
                  </p>
                )}
              </div>

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Trilha
                  </span>
                </div>
                <div className="px-3.5 pt-1 pb-2.5">
                  {m.trilha.length === 0 ? (
                    <p className="text-fg3 py-2 text-[11.5px]">
                      Sem eventos ainda.
                    </p>
                  ) : (
                    m.trilha.map((t, i) => (
                      <div
                        key={i}
                        className="border-line2 grid grid-cols-[58px_1fr] gap-2.5 border-t py-[7px] first:border-t-0"
                      >
                        <span className="text-fg3 font-mono text-[10.5px]">
                          {t.data}
                        </span>
                        <span className="text-fg2 text-[11.5px]">
                          {t.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card "Por que essa data?" — memória de cálculo (proveniência auditável).
 *  Some enquanto não houver prazo derivado da intimação (pending=erro=false
 *  e memoria=null); degrada pra mensagem simples quando o prazo é pré-V1
 *  (memoria.temCalcMemory=false, mas badges de origem/selo continuam na faixa
 *  de identidade acima). */
function MemoriaCalculoCard({
  memoria,
  pending,
  erro,
  emVoo,
  onAceitarDeclarado,
  onAceitarCalculado,
  onAjusteManual,
  onConfirmarTipo,
  onReclassificarTipo,
}: {
  memoria: MemoriaCalculoVM | null;
  pending: boolean;
  erro: boolean;
  emVoo: boolean;
  onAceitarDeclarado: () => void;
  onAceitarCalculado: () => void;
  onAjusteManual: (endDate: string) => void;
  onConfirmarTipo: () => void;
  onReclassificarTipo: (tipo: string) => void;
}) {
  const [ajustando, setAjustando] = useState(false);
  const [dataAjuste, setDataAjuste] = useState("");
  const [reclassificando, setReclassificando] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");

  if (!pending && !erro && !memoria) return null;

  return (
    <div className="border-line bg-panel mt-5 overflow-hidden rounded-[14px] border">
      <div className="border-line2 flex items-center gap-2.5 border-b px-[18px] py-3.5">
        <Sparkles
          className="text-primary size-[17px] shrink-0"
          strokeWidth={1.7}
        />
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold">Por que essa data?</div>
          <div className="text-fg3 text-[11px]">
            Memória de cálculo · proveniência auditável e defensável
          </div>
        </div>
      </div>

      {pending ? (
        <p className="text-fg3 px-[18px] py-6 text-[12.5px]">
          Carregando memória de cálculo…
        </p>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="text-destructive px-[18px] py-6 text-[12.5px]"
        >
          Não foi possível carregar a memória de cálculo.
        </p>
      ) : null}

      {memoria ? (
        <>
          {/* APURAÇÃO: divergência (declarado × calculado) */}
          {memoria.divergencia?.pendente ? (
            <div
              className="border-line2 border-b px-[18px] py-[15px]"
              style={{
                background: "color-mix(in oklch, var(--gold) 6%, transparent)",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert
                  className="size-[15px]"
                  style={{ color: "var(--gold)" }}
                  strokeWidth={1.8}
                />
                <span
                  className="text-[12.5px] font-semibold"
                  style={{ color: "var(--gold)" }}
                >
                  Divergência — declarado ≠ calculado
                </span>
                <span
                  className="ml-auto font-mono text-[11px]"
                  style={{ color: "var(--gold)" }}
                >
                  Δ {memoria.divergencia.difDias} dias
                </span>
              </div>
              <div className="mb-[11px] grid grid-cols-2 gap-2.5">
                <div className="border-line bg-panel rounded-[9px] border px-3 py-2.5">
                  <div className="text-fg3 text-[10px] tracking-[0.04em] uppercase">
                    Declarado na intimação
                  </div>
                  <div className="mt-[3px] font-mono text-[18px] font-medium">
                    {memoria.divergencia.declarada}
                  </div>
                </div>
                <div className="border-line bg-panel rounded-[9px] border px-3 py-2.5">
                  <div className="text-fg3 text-[10px] tracking-[0.04em] uppercase">
                    Calculado por regra
                  </div>
                  <div className="mt-[3px] font-mono text-[18px] font-medium">
                    {memoria.divergencia.calculada}
                  </div>
                </div>
              </div>
              <p className="text-fg2 mb-3 text-[12px] leading-[1.55]">
                <strong className="font-semibold">Causa provável:</strong>{" "}
                {memoria.divergencia.causa}
              </p>

              {!ajustando ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onAceitarDeclarado}
                    disabled={emVoo}
                    className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-[13px] py-2 text-[12.5px] font-medium disabled:opacity-60"
                  >
                    Aceitar declarado · {memoria.divergencia.declarada}
                  </button>
                  <button
                    type="button"
                    onClick={onAceitarCalculado}
                    disabled={emVoo}
                    className="bg-primary text-primary-foreground rounded-lg px-[13px] py-2 text-[12.5px] font-medium disabled:opacity-60"
                  >
                    Aceitar calculado · {memoria.divergencia.calculada}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjustando(true)}
                    disabled={emVoo}
                    className="text-fg2 hover:bg-hover rounded-lg border border-transparent px-[13px] py-2 text-[12.5px] disabled:opacity-60"
                  >
                    Ajuste manual
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-fg3 text-[11px]">
                      Data fatal (ajuste manual)
                    </span>
                    <Input
                      type="date"
                      value={dataAjuste}
                      onChange={(e) => setDataAjuste(e.target.value)}
                      aria-label="Data fatal do ajuste manual"
                      className="h-8 w-40 text-[12.5px]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={emVoo || dataAjuste === ""}
                    onClick={() => {
                      onAjusteManual(dataAjuste);
                      setAjustando(false);
                      setDataAjuste("");
                    }}
                    className="bg-primary text-primary-foreground rounded-lg px-[13px] py-2 text-[12.5px] font-medium disabled:opacity-60"
                  >
                    Confirmar ajuste
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjustando(false)}
                    disabled={emVoo}
                    className="text-fg3 hover:bg-hover rounded-lg px-[13px] py-2 text-[12.5px] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {memoria.divergencia?.resolvida ? (
            <div className="border-line2 border-b px-[18px] py-[15px]">
              <div
                role="status"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                style={{
                  background:
                    "color-mix(in oklch, var(--green) 10%, transparent)",
                  color: "var(--green)",
                }}
              >
                <Check className="size-3.5 shrink-0" strokeWidth={2.2} />
                Apurado — {memoria.divergencia.decisaoLabel}. Selo agora
                Confiável; decisão registrada na trilha.
              </div>
            </div>
          ) : null}

          {/* APURAÇÃO: tipo inferido por IA */}
          {memoria.tipoIa?.pendente ? (
            <div
              className="border-line2 border-b px-[18px] py-[15px]"
              style={{
                background:
                  "color-mix(in oklch, var(--primary) 5%, transparent)",
              }}
            >
              <div className="mb-[11px] flex items-center gap-2">
                <Sparkles
                  className="text-primary size-[15px]"
                  strokeWidth={1.8}
                />
                <span className="text-primary text-[12.5px] font-semibold">
                  Tipo inferido por IA — confirme antes de assumir
                </span>
                <span className="text-fg3 ml-auto font-mono text-[11px]">
                  confiança {memoria.tipoIa.confPct}%
                </span>
              </div>
              <div className="border-line bg-panel mb-[11px] rounded-[9px] border px-[13px] py-[11px]">
                <div className="text-fg3 text-[10px] tracking-[0.04em] uppercase">
                  Ato classificado
                </div>
                <div className="font-display my-2 text-[17px]">
                  {memoria.tipoIa.tipo}
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={memoria.tipoIa.confPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Confiança da classificação: ${memoria.tipoIa.confPct}%`}
                  className="bg-line2 h-[5px] overflow-hidden rounded-full"
                >
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${memoria.tipoIa.confPct}%` }}
                  />
                </div>
              </div>

              {!reclassificando ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onConfirmarTipo}
                    disabled={emVoo}
                    className="bg-primary text-primary-foreground rounded-lg px-[13px] py-2 text-[12.5px] font-medium disabled:opacity-60"
                  >
                    Confirmar tipo
                  </button>
                  <button
                    type="button"
                    onClick={() => setReclassificando(true)}
                    disabled={emVoo}
                    className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-[13px] py-2 text-[12.5px] disabled:opacity-60"
                  >
                    Reclassificar
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-fg3 text-[11px]">Novo tipo</span>
                    <Input
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value)}
                      placeholder="Ex.: Embargos de declaração"
                      aria-label="Novo tipo do ato"
                      className="h-8 w-56 text-[12.5px]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={emVoo || novoTipo.trim() === ""}
                    onClick={() => {
                      onReclassificarTipo(novoTipo);
                      setReclassificando(false);
                      setNovoTipo("");
                    }}
                    className="bg-primary text-primary-foreground rounded-lg px-[13px] py-2 text-[12.5px] font-medium disabled:opacity-60"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReclassificando(false)}
                    disabled={emVoo}
                    className="text-fg3 hover:bg-hover rounded-lg px-[13px] py-2 text-[12.5px] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {memoria.tipoIa?.resolvida ? (
            <div className="border-line2 border-b px-[18px] py-[15px]">
              <div
                role="status"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                style={{
                  background:
                    "color-mix(in oklch, var(--green) 10%, transparent)",
                  color: "var(--green)",
                }}
              >
                <Check className="size-3.5 shrink-0" strokeWidth={2.2} />
                Tipo confirmado — selo agora Confiável; registrado na trilha.
              </div>
            </div>
          ) : null}

          {/* CADEIA DE CÁLCULO */}
          {memoria.temCalcMemory ? (
            <>
              <div className="flex flex-nowrap items-stretch gap-1 overflow-x-auto px-[18px] py-[17px]">
                {memoria.cadeia.map((c, idx) => (
                  <Fragment key={c.kicker}>
                    {idx > 0 ? (
                      <div className="text-fg3 flex items-center px-0.5">
                        <ChevronRight
                          className="size-[15px]"
                          strokeWidth={1.8}
                        />
                      </div>
                    ) : null}
                    <div className="border-line2 bg-bg min-w-[140px] flex-1 rounded-[10px] border px-3 py-[11px]">
                      <div className="text-fg3 text-[10px] tracking-[0.05em] uppercase">
                        {c.kicker}
                      </div>
                      <div className="my-1 font-mono text-[16px] font-medium">
                        {c.valor}
                      </div>
                      <div className="text-fg3 text-[10.5px] leading-[1.45]">
                        {c.sub}
                      </div>
                    </div>
                  </Fragment>
                ))}
                <div className="text-fg3 flex items-center px-0.5">
                  <ArrowRight className="size-4" strokeWidth={2} />
                </div>
                <div
                  className="min-w-[160px] flex-1 rounded-[10px] border px-[13px] py-[11px]"
                  style={{
                    borderColor:
                      "color-mix(in oklch, var(--red) 35%, transparent)",
                    background:
                      "color-mix(in oklch, var(--red) 6%, transparent)",
                  }}
                >
                  <div
                    className="text-[10px] tracking-[0.05em] uppercase"
                    style={{ color: "var(--red)" }}
                  >
                    Resultado
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className="font-mono text-[20px] font-semibold"
                      style={{ color: "var(--red)" }}
                    >
                      {memoria.resultadoFatal}
                    </span>
                    <span className="text-fg3 text-[11px]">fatal</span>
                  </div>
                  {memoria.notaInterna ? (
                    <div className="text-fg2 mt-[5px] text-[11px]">
                      {memoria.notaInterna}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* FERIADOS APLICADOS (snapshot congelado) */}
              <div className="px-[18px] pb-[15px]">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-fg2 text-[10.5px] font-semibold tracking-[0.04em] uppercase">
                    Feriados e suspensões aplicados
                  </span>
                  <span className="text-fg3 text-[10.5px]">
                    snapshot congelado
                  </span>
                </div>
                {memoria.feriados.length === 0 ? (
                  <p className="text-fg3 border-line2 rounded-[10px] border px-[13px] py-2.5 text-[11.5px]">
                    Nenhum feriado ou suspensão aplicado neste cálculo.
                  </p>
                ) : (
                  <div className="border-line2 overflow-hidden rounded-[10px] border">
                    {memoria.feriados.map((f, idx) => (
                      <div
                        key={`${f.data}-${idx}`}
                        className="border-line2 grid grid-cols-[88px_1fr_auto] items-center gap-3 border-b px-[13px] py-2.5 last:border-b-0"
                      >
                        <span className="text-fg2 font-mono text-[12px]">
                          {f.data}
                        </span>
                        <span className="text-[12.5px]">{f.nome}</span>
                        <span className="bg-hover text-fg3 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {f.ambito}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-fg3 px-[18px] py-6 text-[12.5px] leading-[1.6]">
              Memória de cálculo indisponível para este prazo.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

/** Marcador de um passo do stepper: concluído (círculo cheio + check), atual
 *  (anel vazado destacado) ou pendente (círculo tracejado). */
function StepMarcador({ estado }: { estado: "done" | "current" | "todo" }) {
  if (estado === "done") {
    return (
      <span
        className="grid size-[15px] place-items-center rounded-full"
        style={{ background: "var(--primary)" }}
      >
        <Check
          className="size-[9px]"
          strokeWidth={3}
          style={{ color: "var(--primary-foreground)" }}
        />
      </span>
    );
  }
  return (
    <span
      className="size-[15px] rounded-full"
      style={{
        border:
          estado === "current"
            ? "2px solid var(--primary)"
            : "1.5px dashed var(--line)",
        background: "transparent",
      }}
    />
  );
}

/** Menu de atribuição do responsável (papel único 0057) — ligado a onAssign.
 *  Trigger discreto (avatar + anel sutil no hover), mesmo padrão visual de
 *  `AtribuirResponsavelProcesso` (src/features/processos/components/atribuir-responsavel.tsx). */
function ResponsavelMenu({
  value,
  nome,
  membros,
  emVoo,
  onAssign,
}: {
  value: string | null;
  nome: string;
  membros: { id: string; name: string; email: string }[];
  emVoo: boolean;
  onAssign: (assigneeUserId: string | null) => void;
}) {
  const avatarSize = 28;

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={emVoo}
        aria-label={nome ? `Responsável: ${nome}` : "Atribuir responsável"}
        title={nome || "Atribuir responsável"}
        className="hover:ring-border flex cursor-pointer items-center gap-2.5 rounded-full outline-none hover:ring-2 disabled:pointer-events-none disabled:opacity-60"
      >
        {nome ? (
          <Avatar nome={nome} size={avatarSize} />
        ) : (
          <span
            aria-hidden
            className="border-muted-foreground/40 hover:border-primary shrink-0 rounded-full border border-dashed"
            style={{ width: avatarSize, height: avatarSize }}
          />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup className={POPUP_CLASS}>
            <Menu.RadioGroup
              value={value ?? ""}
              onValueChange={(v) =>
                onAssign(typeof v === "string" && v ? v : null)
              }
            >
              <Menu.RadioItem value="" className={cn(ITEM_CLASS, "gap-2")}>
                <span className="border-muted-foreground/40 size-6 shrink-0 rounded-full border border-dashed" />
                <span className="text-muted-foreground flex-1 truncate">
                  Ninguém
                </span>
                <Menu.RadioItemIndicator className="ml-auto">
                  <Check className="size-4" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
              {membros.map((mem) => {
                const label = nomeExibicao(mem.name, mem.email);
                return (
                  <Menu.RadioItem
                    key={mem.id}
                    value={mem.id}
                    className={cn(ITEM_CLASS, "gap-2")}
                  >
                    <Avatar nome={label} size={22} />
                    <span className="flex-1 truncate">{label}</span>
                    <Menu.RadioItemIndicator className="ml-auto">
                      <Check className="size-4" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
