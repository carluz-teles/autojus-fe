"use client";

import { Plus } from "lucide-react";

import { OabInput } from "@/components/ui/oab-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourtAccessNotice } from "@/features/onboarding/components/court-access-notice";

import {
  type FontesTab,
  type ResumoCard,
  useFontes,
} from "../../hooks/use-fontes";
import { ConfigToggle } from "./config-toggle";
import { ConfigTribunais } from "./config-tribunais";

// Cards de resumo (rótulo / valor grande / sublinha) usados em Termos e Ingestões.
function ResumoCards({ cards }: { cards: ResumoCard[] }) {
  return (
    <div className="mb-[18px] grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {cards.map((r) => (
        <div key={r.rot} className="surface-panel min-w-0 px-[15px] py-[13px]">
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

// Linhas de esqueleto durante o carregamento das listas.
function Skeleton({ linhas }: { linhas: number }) {
  return (
    <div className="surface-panel overflow-hidden">
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="border-line2 flex items-center gap-3 border-b px-4 py-[15px] last:border-b-0"
        >
          <span className="min-w-0 flex-1">
            <span className="bg-hover mb-1.5 block h-3 w-40 animate-pulse rounded" />
            <span className="bg-hover block h-2.5 w-56 animate-pulse rounded" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="surface-panel text-fg3 px-4 py-8 text-center text-[12.5px]">
      {texto}
    </div>
  );
}

function Erro({ texto }: { texto: string }) {
  return <p className="text-destructive text-[12.5px]">{texto}</p>;
}

// Aba Fontes de dados — port do template 1369-1453, ligada ao BE (ingestão):
// Tribunais (court connections) / Termos (watched-oabs) / Ingestões (captures).
export function ConfigFontes({
  initialTab,
  onPrepareAccess,
}: {
  initialTab?: FontesTab;
  onPrepareAccess?: () => void;
}) {
  const fon = useFontes(initialTab);

  return (
    <>
      <div className="font-display mb-1 text-[20px] font-medium">
        Fontes de dados
      </div>
      <p className="text-fg3 mt-0 mb-4 text-[12.5px]">
        Acessos aos sistemas dos tribunais, OABs monitoradas e histórico de
        importações.
      </p>

      <Tabs
        defaultValue={initialTab ?? "tribunais"}
        value={fon.fontesTab}
        onValueChange={(value) =>
          fon.fontesTabs.find((tab) => tab.key === value)?.onClick()
        }
      >
        <div className="mb-5">
          <TabsList aria-label="Fontes de dados">
            {fon.fontesTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="tribunais">
          <ConfigTribunais />
        </TabsContent>

        <TabsContent value="termos">
          <div className="mb-4">
            <CourtAccessNotice onPrepare={onPrepareAccess} />
          </div>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <p className="text-fg3 m-0 max-w-[440px] text-[12.5px]">
              OABs que o sistema vigia no DJEN. Toda intimação chega porque
              casou com um destes termos.
            </p>
            <button
              onClick={fon.toggleAddTermo}
              className="bg-primary text-primary-foreground flex min-h-9 flex-none items-center gap-1.5 rounded-lg border-none px-3.5 py-2 text-[12.5px] font-medium pointer-coarse:min-h-11"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              Adicionar termo
            </button>
          </div>

          {fon.addAberto ? (
            <div className="surface-inset mb-[18px] flex flex-wrap items-center gap-2 p-3">
              <OabInput
                autoFocus
                value={fon.addValor}
                onChange={fon.setAddValor}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fon.addTermoSubmit();
                }}
                className="border-line bg-bg text-foreground min-w-0 flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
              <button
                onClick={fon.addTermoSubmit}
                disabled={fon.addTermoAdicionando}
                className="bg-primary text-primary-foreground flex min-h-9 flex-none items-center rounded-[9px] px-4 py-2.5 text-[12.5px] font-medium disabled:opacity-50 pointer-coarse:min-h-11"
              >
                {fon.addTermoAdicionando ? "Adicionando…" : "Adicionar"}
              </button>
            </div>
          ) : null}

          {fon.termosError ? (
            <Erro texto="Não foi possível carregar os termos." />
          ) : fon.termosPending ? (
            <Skeleton linhas={3} />
          ) : (
            <>
              <ResumoCards cards={fon.termosResumo} />
              {fon.termos.length === 0 ? (
                <Vazio texto="Nenhuma OAB monitorada. Adicione um termo para começar a capturar." />
              ) : (
                <div className="surface-panel overflow-hidden">
                  <div className="border-line2 bg-hover flex items-center gap-3 border-b px-4 py-2">
                    <span className="text-fg3 flex-1 text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      Termo
                    </span>
                    <span className="text-fg3 w-24 flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      Captura
                    </span>
                    <span className="text-fg3 w-[74px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      Ativa
                    </span>
                  </div>
                  {fon.termos.map((t) => (
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
                        className="w-24 flex-none text-right text-[13px]"
                        style={{ color: t.capCor }}
                      >
                        {t.cap}
                      </span>
                      <span className="flex w-[74px] flex-none justify-end">
                        <ConfigToggle
                          toggle={t.toggle}
                          label={`Alternar captura para ${t.valor}`}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-fg3 mx-0.5 mt-3.5 text-[11.5px]">
                Termos pausados param de capturar novas intimações, mas o
                histórico já recebido é mantido.
              </p>
            </>
          )}
        </TabsContent>
        <TabsContent value="ingest">
          <div className="mb-4">
            <CourtAccessNotice onPrepare={onPrepareAccess} />
          </div>
          <p className="text-fg3 mt-0 mb-4 max-w-[440px] text-[12.5px]">
            Cada varredura do DJEN — o que foi lido, o que casou com seus termos
            e o que virou intimação.
          </p>
          {fon.ingestError ? (
            <Erro texto="Não foi possível carregar as varreduras." />
          ) : fon.ingestPending ? (
            <Skeleton linhas={3} />
          ) : (
            <>
              <ResumoCards cards={fon.ingestResumo} />
              {fon.ingestoes.length === 0 ? (
                <Vazio texto="Nenhuma varredura registrada ainda." />
              ) : (
                <div className="surface-panel overflow-hidden">
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
                  {fon.ingestoes.map((g) => (
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
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
