"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronLeft, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  AnalisarLoading,
  ProvidenciaRow,
} from "@/features/intimacoes/components/shared/analisar-card";
import {
  Avatar,
  initials,
} from "@/features/intimacoes/components/shared/avatar";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { cn } from "@/lib/utils";

import { useIntimacaoDetalhe } from "../../hooks/use-intimacao-detalhe";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-72 min-w-48 origin-(--transform-origin) overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50";

// Detalhe da intimação (unidade de trabalho), ligado ao backend real via
// useIntimacaoDetalhe. Faixa de identidade + stepper de ciclo de vida; 2 colunas:
// providências geradas por IA (sob demanda) à esquerda, teor + trilha à direita;
// rodapé de ações (resolver/ignorar/reabrir + responsável).
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
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
                    style={{ background: m.statusFundo, color: m.statusCor }}
                  >
                    {m.statusLabel}
                  </span>
                  <span className="bg-hover text-fg2 inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium">
                    {m.tipoLabel}
                  </span>
                  <span className="text-fg3 text-[11.5px]">{m.orgao}</span>
                </div>
                <h1 className="font-display mt-2.5 text-[27px] leading-[1.1] tracking-[-0.01em]">
                  {m.titulo}
                </h1>
                <p className="text-fg3 mt-2 text-[12px]">
                  publicado em {m.publicadoEm}
                </p>
              </div>
              <div className="border-line2 flex shrink-0 items-baseline gap-2.5 border-l pl-[22px]">
                <span
                  className="text-[40px] leading-none font-semibold tabular-nums"
                  style={{ color: m.prazoCor }}
                >
                  {m.prazoNum}
                </span>
                <span className="text-fg3 text-[12px] leading-[1.5]">
                  {m.prazoFrase}
                  <br />
                  prazo{" "}
                  <strong className="text-foreground font-medium">
                    {m.prazoConfirmado ? "confirmado" : "sugerido"}
                  </strong>
                </span>
              </div>
            </div>
            {/* stepper de ciclo de vida */}
            <div className="border-line2 bg-bg flex items-center border-t px-[22px] py-3.5">
              {m.stepper.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center"
                  style={{ flex: s.flex }}
                >
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: s.cor }}
                    />
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
                    <ul className="px-4">
                      {m.providencias.map(({ p, idx }) => (
                        <ProvidenciaRow
                          key={`${p.title}-${idx}`}
                          intimacaoId={m.id}
                          providencia={p}
                          idx={idx}
                        />
                      ))}
                    </ul>
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

            {/* SECUNDÁRIA: como a IA leu + teor + trilha */}
            <div className="flex flex-col gap-3.5">
              {m.analisada && !m.degradado && m.resumo ? (
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
                  </div>
                  <p className="text-fg2 mt-2 text-[12.5px] leading-[1.55]">
                    {m.resumo}
                  </p>
                </div>
              ) : null}

              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                <div className="border-line2 border-b px-3.5 py-2.5">
                  <span className="text-fg2 text-[11px] font-semibold tracking-[0.03em] uppercase">
                    Teor da intimação
                  </span>
                </div>
                <p className="text-fg2 px-3.5 py-3 text-[12.5px] leading-[1.6]">
                  {m.teor ||
                    "Teor integral indisponível — publicação capturada do DJEN."}
                </p>
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

      {/* rodapé de ações */}
      <div className="border-line bg-panel flex shrink-0 items-center gap-2 border-t px-8 py-3">
        <div className="mx-auto flex w-full max-w-[1080px] items-center gap-2">
          {m.podeReabrir ? (
            <button
              onClick={det.onReabrir}
              disabled={det.triagemEmVoo}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-[13px] font-medium disabled:opacity-60"
            >
              Reabrir
            </button>
          ) : (
            <>
              <button
                onClick={det.onResolver}
                disabled={det.triagemEmVoo}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-[13px] font-medium disabled:opacity-60"
              >
                Resolver
              </button>
              <button
                onClick={det.onIgnorar}
                disabled={det.triagemEmVoo}
                className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2.5 text-[13px] disabled:opacity-60"
              >
                Ignorar
              </button>
            </>
          )}

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
  );
}

/** Menu de atribuição do responsável (papel único 0057) — ligado a onAssign. */
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
  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={emVoo}
        title={nome || "Atribuir responsável"}
        className="navi border-line bg-panel text-foreground hover:bg-hover ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] disabled:opacity-60"
      >
        {nome ? (
          <Avatar size="sm" variant="outline" initials={initials(nome)} />
        ) : (
          <span
            aria-hidden
            className="border-muted-foreground/40 size-5 shrink-0 rounded-full border border-dashed"
          />
        )}
        <span className="max-w-[140px] truncate">
          {nome || "Atribuir responsável"}
        </span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="end" sideOffset={6} className="z-50">
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
                    <Avatar size="sm" initials={initials(label)} />
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
