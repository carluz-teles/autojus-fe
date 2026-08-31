"use client";

import { Plus } from "lucide-react";

import { type ResumoCard, useFontes } from "../../hooks/use-fontes";
import { ConfigToggle } from "./config-toggle";
import { ConfigTribunais } from "./config-tribunais";

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

// Linhas de esqueleto durante o carregamento das listas.
function Skeleton({ linhas }: { linhas: number }) {
  return (
    <div className="border-line bg-panel overflow-hidden rounded-xl border">
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
    <div className="border-line bg-panel text-fg3 rounded-xl border px-4 py-8 text-center text-[12.5px]">
      {texto}
    </div>
  );
}

function Erro({ texto }: { texto: string }) {
  return <p className="text-destructive text-[12.5px]">{texto}</p>;
}

// Aba Fontes de dados — port do template 1369-1453, ligada ao BE (ingestão):
// Integrações (read-only) / Termos (watched-oabs) / Ingestões (captures).
export function ConfigFontes() {
  const fon = useFontes();

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
        {fon.fontesTabs.map((ft) => (
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

      {fon.fontesTab === "integr" ? (
        <>
          <p className="text-fg3 mt-0 mb-3.5 text-[12.5px]">
            Tribunais e serviços conectados à plataforma.
          </p>
          {fon.integrError ? (
            <Erro texto="Não foi possível carregar as integrações." />
          ) : fon.integrPending ? (
            <Skeleton linhas={2} />
          ) : fon.integracoes.length === 0 ? (
            <Vazio texto="Nenhuma integração conectada ainda." />
          ) : (
            <div className="border-line bg-panel overflow-hidden rounded-xl border">
              {fon.integracoes.map((i) => (
                <div
                  key={i.id}
                  className="border-line2 flex items-center gap-3.5 border-b px-4 py-[13px] last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      {i.nome}
                    </span>
                    <span className="text-fg3 block text-[11.5px]">
                      {i.desc}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-full px-2.5 py-[3px] text-[10.5px] font-medium"
                    style={{ background: i.statusBg, color: i.statusFg }}
                  >
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {fon.fontesTab === "tribunais" ? <ConfigTribunais /> : null}

      {fon.fontesTab === "termos" ? (
        <>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <p className="text-fg3 m-0 max-w-[440px] text-[12.5px]">
              OABs que o sistema vigia no DJEN. Toda intimação chega porque
              casou com um destes termos.
            </p>
            <button
              onClick={fon.toggleAddTermo}
              className="bg-primary text-primary-foreground flex flex-none items-center gap-1.5 rounded-lg border-none px-3.5 py-2 text-[12.5px] font-medium"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              Adicionar termo
            </button>
          </div>

          {fon.addAberto ? (
            <div className="border-line bg-panel mb-[18px] flex items-center gap-2 rounded-xl border p-3">
              <input
                autoFocus
                value={fon.addValor}
                onChange={(e) => fon.setAddValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fon.addTermoSubmit();
                }}
                placeholder="OAB/SP 214.885"
                className="border-line bg-bg text-foreground flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
              <button
                onClick={fon.addTermoSubmit}
                disabled={fon.addTermoAdicionando}
                className="bg-primary text-primary-foreground flex-none rounded-[9px] px-4 py-2.5 text-[12.5px] font-medium disabled:opacity-50"
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
                <div className="border-line bg-panel overflow-hidden rounded-xl border">
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
                        <ConfigToggle toggle={t.toggle} />
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
        </>
      ) : null}

      {fon.fontesTab === "ingest" ? (
        <>
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
        </>
      ) : null}
    </>
  );
}
