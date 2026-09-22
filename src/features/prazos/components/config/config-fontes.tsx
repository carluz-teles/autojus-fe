"use client";

import { Plus, Radio } from "lucide-react";

import { OabInput } from "@/components/ui/oab-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutosBuscasSection } from "@/features/configuracoes/components/autos-buscas-section";
import { OabTermRow } from "@/features/shared/components/oab-term-row";

import {
  type FontesTab,
  type ResumoCard,
  useFontes,
} from "../../hooks/use-fontes";
import {
  SettingsSection,
  type StatCard,
  StatGrid,
  StatusPill,
  type Tone,
} from "./config-kit";
import { ConfigToggle } from "./config-toggle";
import { ConfigTribunais } from "./config-tribunais";

// Mapeia os cards de resumo do hook (rot/val/sub) pro StatCard do kit, colorindo
// por posição — o hook segue agnóstico de UI, o tom fica na borda visual.
function toStats(cards: ResumoCard[], tones: Tone[]): StatCard[] {
  return cards.map((c, i) => ({
    label: c.rot,
    value: c.val,
    sub: c.sub,
    tone: tones[i] ?? "neutral",
  }));
}

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
    <div className="surface-panel text-fg3 px-4 py-10 text-center text-[12.5px]">
      {texto}
    </div>
  );
}

function Erro({ texto }: { texto: string }) {
  return <p className="text-destructive text-[12.5px]">{texto}</p>;
}

// Aba Fontes de dados, ligada ao BE (ingestão): Tribunais (court connections) /
// OABs (watched-oabs) / Ingestões (captures). Linguagem do onboarding (kit).
export function ConfigFontes({
  initialTab,
  onPrepareAccess,
}: {
  initialTab?: FontesTab;
  onPrepareAccess?: () => void;
}) {
  const fon = useFontes(initialTab);
  const goTribunais = () =>
    fon.fontesTabs.find((t) => t.key === "tribunais")?.onClick();
  const prepararAcesso = onPrepareAccess ?? goTribunais;

  return (
    <SettingsSection
      title="Fontes de dados"
      subtitle="Acessos aos tribunais, OABs monitoradas e o histórico de cada importação."
    >
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

        {/* ---- OABs monitoradas ---- */}
        <TabsContent value="termos">
          {fon.termosError ? (
            <Erro texto="Não foi possível carregar as OABs." />
          ) : fon.termosPending ? (
            <Skeleton linhas={3} />
          ) : (
            <>
              <StatGrid
                cards={toStats(fon.termosResumo, [
                  "success",
                  "info",
                  "neutral",
                ])}
              />

              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="text-fg3 m-0 max-w-[440px] text-[12.5px] leading-[1.5]">
                  OABs que o Atjus vigia no DJEN. Toda intimação chega porque
                  casou com uma destas.
                </p>
                <button
                  onClick={fon.toggleAddTermo}
                  className="text-primary-foreground flex min-h-9 flex-none items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium shadow-sm transition-transform duration-200 hover:-translate-y-px pointer-coarse:min-h-11"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, var(--primary), var(--gold))",
                  }}
                >
                  <Plus className="size-3.5" strokeWidth={2.2} />
                  Adicionar OAB
                </button>
              </div>

              {fon.addAberto ? (
                <div className="surface-inset reveal mb-3 flex flex-wrap items-center gap-2 p-3">
                  <OabInput
                    autoFocus
                    value={fon.addValor}
                    onChange={fon.setAddValor}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fon.addTermoSubmit();
                    }}
                    className="border-line bg-bg text-foreground focus:border-primary min-w-0 flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
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

              {fon.termos.length === 0 ? (
                <Vazio texto="Nenhuma OAB monitorada. Adicione uma para começar a capturar." />
              ) : (
                <div className="surface-panel overflow-hidden">
                  <div className="border-line2 bg-hover flex items-center gap-3 border-b px-4 py-2">
                    <span className="text-fg3 flex-1 text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      OAB
                    </span>
                    <span className="text-fg3 w-24 flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      Captura
                    </span>
                    <span className="text-fg3 w-[74px] flex-none text-right text-[10.5px] font-medium tracking-[0.04em] uppercase">
                      Ativa
                    </span>
                  </div>
                  {fon.termos.map((t) => (
                    <OabTermRow key={t.valor} value={t.valor} subtitle={t.dono}>
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
                    </OabTermRow>
                  ))}
                </div>
              )}
              <p className="text-fg3 mx-0.5 mt-3.5 text-[11.5px] leading-[1.5]">
                OABs pausadas param de capturar novas intimações, mas o
                histórico já recebido é mantido.{" "}
                <button
                  onClick={prepararAcesso}
                  className="text-primary hover:underline"
                >
                  Configurar acesso aos autos
                </button>
              </p>
            </>
          )}
        </TabsContent>

        {/* ---- Ingestões / varreduras ---- */}
        <TabsContent value="ingest">
          {fon.ingestError ? (
            <Erro texto="Não foi possível carregar as varreduras." />
          ) : fon.ingestPending ? (
            <Skeleton linhas={3} />
          ) : (
            <>
              <StatGrid
                cards={toStats(fon.ingestResumo, ["info", "success", "info"])}
              />
              <p className="text-fg3 mt-0 mb-3 max-w-[460px] text-[12.5px] leading-[1.5]">
                Cada varredura do DJEN — o que foi lido, o que casou com suas
                OABs e o que virou intimação.
              </p>
              {fon.ingestoes.length === 0 ? (
                <Vazio texto="Nenhuma varredura registrada ainda. Assim que uma OAB estiver ativa, a primeira captura roda em segundo plano." />
              ) : (
                <div className="surface-panel divide-line2 reveal-stagger divide-y overflow-hidden">
                  {fon.ingestoes.map((g, i) => {
                    const live = g.st === "Em andamento";
                    const iconCor = live ? "var(--blue)" : g.tipoCor;
                    return (
                      <button
                        key={`${g.data}-${g.hora}-${g.tipo}-${i}`}
                        onClick={g.onClick}
                        className="hover:bg-hover flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                      >
                        <span
                          className="grid size-9 flex-none place-items-center rounded-xl"
                          style={{
                            background: `color-mix(in oklch, ${iconCor} 12%, transparent)`,
                            color: iconCor,
                          }}
                        >
                          <Radio
                            className={`size-4 ${live ? "animate-pulse" : ""}`}
                            strokeWidth={1.9}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className="flex-none rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                              style={{
                                background: `color-mix(in oklch, ${g.tipoCor} 14%, transparent)`,
                                color: g.tipoCor,
                              }}
                            >
                              {g.tipo}
                            </span>
                            <span className="text-[13px] font-medium">
                              {g.data} · {g.hora}
                            </span>
                            {g.oabs.length > 0 && (
                              <span className="text-fg3 text-[11.5px]">
                                OAB {g.oabs.join(", ")}
                              </span>
                            )}
                          </span>
                          <span className="text-fg3 mt-0.5 block text-[11.5px]">
                            {g.gatilho} · {g.dur} · {g.varridas} varridas ·{" "}
                            <span className="text-foreground font-medium">
                              {g.novas} novas
                            </span>
                            {g.prazos !== "0" && ` · ${g.prazos} prazos`}
                          </span>
                        </span>
                        <StatusPill
                          label={g.st}
                          pulse={live}
                          tone={
                            g.st === "Concluída"
                              ? "success"
                              : g.st === "Falha parcial"
                                ? "danger"
                                : live
                                  ? "info"
                                  : "warning"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <AutosBuscasSection />
        </TabsContent>
      </Tabs>
    </SettingsSection>
  );
}
