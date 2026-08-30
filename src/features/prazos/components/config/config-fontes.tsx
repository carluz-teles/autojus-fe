"use client";

import { Plus, RefreshCw } from "lucide-react";

import type { ResumoCard, useConfig } from "../../hooks/use-config";
import { ConfigToggle } from "./config-toggle";

// Cards de resumo (rótulo / valor grande / sublinha) usados em Termos e Ingestões.
function ResumoCards({ cards }: { cards: ResumoCard[] }) {
  return (
    <div className="mb-[18px] flex gap-2.5">
      {cards.map((r) => (
        <div
          key={r.rot}
          className="border-line bg-panel flex-1 rounded-xl border px-[15px] py-[13px]"
        >
          <div className="text-fg3 mb-[5px] text-[11px]">{r.rot}</div>
          <div className="font-display text-[22px] leading-none font-medium tabular-nums">
            {r.val}
          </div>
          <div className="text-fg3 mt-[5px] text-[10.5px]">{r.sub}</div>
        </div>
      ))}
    </div>
  );
}

// Aba Fontes de dados — port do template 1369-1453: título + sub-abas
// (Integrações / Termos / Ingestões) com estado local no hook.
export function ConfigFontes({ cfg }: { cfg: ReturnType<typeof useConfig> }) {
  return (
    <>
      <div className="font-display mb-1 text-[20px] font-medium">
        Fontes de dados
      </div>
      <p className="text-fg3 mt-0 mb-4 text-[12.5px]">
        De onde as intimações chegam — tribunais conectados, o que o sistema
        vigia e o registro de cada varredura.
      </p>

      {/* sub-abas */}
      <div className="border-line mb-[22px] flex gap-0.5 border-b">
        {cfg.fontesTabs.map((ft) => (
          <button
            key={ft.key}
            onClick={ft.onClick}
            className="-mb-px border-b-2 border-none bg-transparent px-2.5 pt-2 pb-2.5 text-[13px]"
            style={{
              color: ft.fg,
              borderBottomColor: ft.borda,
              fontWeight: ft.peso,
            }}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {cfg.fontesTab === "integr" ? (
        <>
          <p className="text-fg3 mt-0 mb-3.5 text-[12.5px]">
            Tribunais e serviços conectados à plataforma.
          </p>
          <div className="border-line bg-panel overflow-hidden rounded-xl border">
            {cfg.integracoes.map((i) => (
              <div
                key={i.nome}
                className="border-line2 flex items-center gap-3.5 border-b px-4 py-[13px] last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    {i.nome}
                  </span>
                  <span className="text-fg3 block text-[11.5px]">{i.desc}</span>
                </span>
                <ConfigToggle toggle={i.toggle} />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {cfg.fontesTab === "termos" ? (
        <>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <p className="text-fg3 m-0 max-w-[440px] text-[12.5px]">
              OABs, nomes e CNPJs que o sistema vigia no DJEN. Toda intimação
              chega porque casou com um destes termos.
            </p>
            <button
              onClick={cfg.addTermo}
              className="bg-primary text-primary-foreground flex flex-none items-center gap-1.5 rounded-lg border-none px-3.5 py-2 text-[12.5px] font-medium"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              Adicionar termo
            </button>
          </div>
          <ResumoCards cards={cfg.termosResumo} />
          <div className="border-line bg-panel overflow-hidden rounded-xl border">
            <div className="border-line2 bg-hover flex items-center gap-3 border-b px-4 py-2">
              <span className="text-fg3 flex-1 text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Termo
              </span>
              <span className="text-fg3 w-24 flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                30 dias
              </span>
              <span className="text-fg3 w-[74px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Captura
              </span>
            </div>
            {cfg.termos.map((t) => (
              <div
                key={t.valor}
                className="border-line2 hover:bg-hover flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span
                  className="w-[46px] flex-none rounded-md py-[3px] text-center text-[10px] font-semibold"
                  style={{ background: t.tchBg, color: t.tchFg }}
                >
                  {t.tipo}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[13px] font-medium ${t.mono ? "font-mono" : ""}`}
                  >
                    {t.valor}
                  </span>
                  <span className="text-fg3 mt-px block text-[11.5px]">
                    {t.dono}
                  </span>
                </span>
                <span
                  className="w-24 flex-none text-right font-mono text-[13px]"
                  style={{ color: t.capCor }}
                >
                  {t.cap}
                </span>
                <span className="flex w-[74px] flex-none justify-end">
                  <ConfigToggle toggle={t.toggle} />
                </span>
              </div>
            ))}
          </div>
          <p className="text-fg3 mx-0.5 mt-3.5 text-[11.5px]">
            Termos pausados param de capturar novas intimações, mas o histórico
            já recebido é mantido.
          </p>
        </>
      ) : null}

      {cfg.fontesTab === "ingest" ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-fg3 m-0 max-w-[440px] text-[12.5px]">
              Cada varredura do DJEN — o que foi lido, o que casou com seus
              termos e o que virou intimação.
            </p>
            <button
              onClick={cfg.forcarIngest}
              className="border-line bg-panel text-foreground hover:bg-hover flex flex-none items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
            >
              <RefreshCw className="size-3.5" strokeWidth={1.8} />
              Varrer agora
            </button>
          </div>
          <ResumoCards cards={cfg.ingestResumo} />
          <div className="border-line bg-panel overflow-hidden rounded-xl border">
            <div className="border-line2 bg-hover flex items-center gap-3 border-b px-4 py-2">
              <span className="text-fg3 flex-1 text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Varredura
              </span>
              <span className="text-fg3 w-[78px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Varridas
              </span>
              <span className="text-fg3 w-[66px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Novas
              </span>
              <span className="text-fg3 w-[120px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                Status
              </span>
            </div>
            {cfg.ingestoes.map((g) => (
              <button
                key={`${g.data}-${g.hora}`}
                onClick={g.onClick}
                className="border-line2 hover:bg-hover flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    {g.data} · {g.hora}
                  </span>
                  <span className="text-fg3 mt-px block text-[11.5px]">
                    {g.gatilho} · {g.dur}
                  </span>
                </span>
                <span className="text-fg2 w-[78px] flex-none text-right font-mono text-[12.5px]">
                  {g.varridas}
                </span>
                <span className="w-[66px] flex-none text-right font-mono text-[12.5px]">
                  {g.novas}
                </span>
                <span className="flex w-[120px] flex-none justify-end">
                  <span
                    className="rounded-full px-2.5 py-[3px] text-[10.5px] font-medium"
                    style={{ background: g.stBg, color: g.stCor }}
                  >
                    {g.st}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
