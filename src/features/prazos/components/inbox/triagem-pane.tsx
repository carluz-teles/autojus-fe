"use client";

import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { PrioIcon } from "../icons";
import type { InboxModel } from "./inbox-view";

// Painel esquerdo da Inbox (468px): resumo + saved views + filtros + faixas de
// lote (lanes) colapsáveis com ação em lote. Componente = JSX + binding; toda a
// lógica vem do hook (inbox).
export function TriagemPane({ inbox }: { inbox: InboxModel }) {
  const { resumo, savedViews, filtros, lanes, foco } = inbox;

  return (
    <div className="border-line bg-panel flex w-[468px] shrink-0 flex-col border-r">
      {/* resumo + filtros */}
      <div className="border-line relative z-[5] shrink-0 border-b px-[18px] pt-4 pb-3">
        <div className="text-fg3 text-[11.5px]">Chegaram nas últimas 24h</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[30px] font-semibold tracking-[-0.01em] tabular-nums">
            {resumo.total}
          </span>
          <span className="text-fg3 text-[12.5px]">
            ·{" "}
            <strong className="text-foreground font-medium">
              {resumo.precisa}
            </strong>{" "}
            precisam de você
          </span>
        </div>

        {/* saved views (pills de escopo) */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {savedViews.map((v) => (
            <button
              key={v.key}
              onClick={v.onClick}
              className="rounded-full border px-[11px] py-[5px] text-[11.5px] font-medium"
              style={{ borderColor: v.borda, background: v.bg, color: v.fg }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* filtros: responsável + órgão */}
        <div className="relative mt-2 flex items-center gap-1.5">
          <FiltroBtn
            ativo={!!filtros.resp}
            label={filtros.respLabel}
            icon={<User className="size-3.5" strokeWidth={1.8} />}
            onClick={filtros.abrirResp}
          />
          <FiltroBtn
            ativo={!!filtros.orgao}
            label={filtros.orgaoLabel}
            icon={<Building2 className="size-3.5" strokeWidth={1.8} />}
            onClick={filtros.abrirOrgao}
          />
          {filtros.hasFilter ? (
            <button
              onClick={filtros.limpar}
              className="text-fg3 px-1 py-1.5 text-[11.5px] underline underline-offset-[3px]"
            >
              limpar
            </button>
          ) : null}

          {filtros.menu ? (
            <button
              aria-label="Fechar"
              onClick={filtros.fecharMenu}
              className="fixed inset-0 z-[6] cursor-default"
            />
          ) : null}
          {filtros.menu === "resp" ? (
            <FiltroMenu
              itens={filtros.respItens}
              onClose={filtros.fecharMenu}
              width={220}
            />
          ) : null}
          {filtros.menu === "orgao" ? (
            <FiltroMenu
              itens={filtros.orgaoItens}
              onClose={filtros.fecharMenu}
              width={260}
              left={132}
            />
          ) : null}
        </div>
      </div>

      {/* lanes */}
      <div className="flex-1 overflow-y-auto">
        {lanes.length === 0 ? (
          <div className="text-fg3 px-[18px] py-10 text-center text-[12.5px]">
            Nada para triar — tudo em dia. 🎉
          </div>
        ) : (
          lanes.map((l) => (
            <div key={l.key} className="border-line2 border-b">
              <div className="flex items-center gap-2 py-[11px] pr-3.5 pl-3">
                <button
                  onClick={l.onToggle}
                  className="hover:bg-hover flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-left"
                >
                  <ChevronRight
                    className="text-fg3 size-3 shrink-0 transition-transform"
                    strokeWidth={2.2}
                    style={{ transform: l.aberta ? "rotate(90deg)" : "none" }}
                  />
                  <span className="min-w-0 truncate text-[12.5px] font-medium">
                    {l.label}
                  </span>
                  <span
                    className="font-mono text-[12px] font-medium"
                    style={{ color: l.cor }}
                  >
                    {l.n}
                  </span>
                </button>
                <button
                  onClick={l.onBulk}
                  className="border-primary/35 bg-selected text-primary shrink-0 rounded-md border px-2.5 py-1.5 text-[11.5px] font-medium"
                >
                  {l.bulkLabel}
                </button>
              </div>

              {l.aberta ? (
                <div className="pb-1.5">
                  {l.itens.map((it) => {
                    const focado = foco?.id === it.id;
                    const selecionado = inbox.sel[it.id];
                    return (
                      <div
                        key={it.id}
                        className="hover:bg-hover grid grid-cols-[18px_15px_1fr_auto] items-center gap-2.5 py-[7px] pr-3.5 pl-3"
                        style={{
                          borderLeft: `2px solid ${focado ? it.urgCor : "transparent"}`,
                          background: focado ? it.urgFundo : undefined,
                        }}
                      >
                        <button
                          onClick={() => inbox.toggleSel(it.id)}
                          title="Selecionar"
                          className="grid size-[15px] place-items-center rounded-[4px] border text-[9px]"
                          style={{
                            borderColor: selecionado
                              ? "var(--primary)"
                              : "var(--line)",
                            background: selecionado
                              ? "var(--primary)"
                              : "transparent",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          {selecionado ? "✓" : ""}
                        </button>
                        <PrioIcon k={it.urgK} />
                        <button
                          onClick={() => inbox.focar(it.id)}
                          className="min-w-0 text-left"
                        >
                          <span className="block truncate text-[12.5px]">
                            {it.providencia}
                          </span>
                          <span className="text-fg3 mt-px block truncate text-[11px]">
                            {it.cliente}
                          </span>
                        </button>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: it.urgCor }}
                        >
                          {it.prazoCurto}
                        </span>
                      </div>
                    );
                  })}
                  {l.temExtra ? (
                    <div className="text-fg3 px-4 pt-2 pb-1 text-[11.5px]">
                      +{l.extra} mais — refine por responsável para lotes
                      menores.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FiltroBtn({
  ativo,
  label,
  icon,
  onClick,
}: {
  ativo: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-[12px]",
        ativo
          ? "border-primary/40 bg-selected text-primary"
          : "border-line bg-panel text-fg2",
      )}
    >
      {icon}
      {label}
      <ChevronDown className="size-[11px]" strokeWidth={2} />
    </button>
  );
}

interface FiltroOpt {
  label: string;
  ativo: boolean;
  onSelect: () => void;
}

// Dropdown de um filtro (responsável / órgão): item ativo recebe check. Port do
// menu do mockup (posição absoluta abaixo do botão de filtro).
function FiltroMenu({
  itens,
  onClose,
  width,
  left = 0,
}: {
  itens: FiltroOpt[];
  onClose: () => void;
  width: number;
  left?: number;
}) {
  return (
    <div
      className="border-line bg-panel absolute top-full z-[7] mt-1 max-h-[280px] overflow-y-auto rounded-[9px] border p-1.5 shadow-[0_14px_36px_oklch(0.27_0.012_200_/_16%)]"
      style={{ width, left }}
    >
      {itens.map((o) => (
        <button
          key={o.label}
          onClick={() => {
            o.onSelect();
            onClose();
          }}
          className="hover:bg-hover text-foreground flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px]"
        >
          <span className="min-w-0 truncate">{o.label}</span>
          {o.ativo ? (
            <Check
              className="text-primary size-3.5 shrink-0"
              strokeWidth={2.2}
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}
