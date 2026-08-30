"use client";

import { CreditCard, Download } from "lucide-react";

import { useConfig } from "../../hooks/use-config";
import { ConfigCert } from "./config-cert";
import { ConfigEquipe } from "./config-equipe";
import { ConfigFontes } from "./config-fontes";
import { ConfigNotif } from "./config-notif";

// Tela de Configurações (rebranding), port do template 1262-1491: sub-nav
// esquerda (~232px) + painel de conteúdo que troca por aba. Perfil / Organização
// / Plano ficam inline; Equipe / Fontes / Certificados / Notificações vêm de
// componentes dedicados neste diretório.
export function ConfigView() {
  const cfg = useConfig();

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* sub-nav de configurações */}
      <div className="border-line bg-panel w-[232px] flex-none overflow-y-auto border-r px-2.5 py-4">
        <div className="text-fg3 px-2.5 pt-1 pb-2.5 text-[10.5px] font-medium tracking-[0.05em] uppercase">
          Configurações
        </div>
        {cfg.nav.map((t) => (
          <button
            key={t.key}
            onClick={t.onClick}
            className="mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px]"
            style={{ background: t.bg, color: t.fg, fontWeight: t.peso }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* conteúdo */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 pt-7 pb-12">
          {cfg.tab === "perfil" ? (
            <>
              <div className="font-display mb-1 text-[20px] font-medium">
                Perfil
              </div>
              <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
                Seus dados pessoais e credenciais.
              </p>
              <div className="mb-[18px] flex items-center gap-3.5">
                <span className="text-primary grid size-14 place-items-center rounded-full text-[18px] font-semibold [background:color-mix(in_oklch,var(--primary)_14%,transparent)]">
                  {cfg.iniciais}
                </span>
                <button
                  onClick={cfg.trocarFoto}
                  className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px]"
                >
                  Trocar foto
                </button>
              </div>
              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                {cfg.perfil.map((l) => (
                  <div
                    key={l.rot}
                    className="border-line2 flex items-center gap-3.5 border-b px-4 py-3 last:border-b-0"
                  >
                    <span className="text-fg3 w-[120px] flex-none text-[12px]">
                      {l.rot}
                    </span>
                    <span className="flex-1 text-[13px]">{l.val}</span>
                    <button
                      onClick={() => cfg.editarPerfil(l.rot)}
                      className="text-primary text-[11.5px]"
                    >
                      editar
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {cfg.tab === "org" ? (
            <>
              <div className="font-display mb-1 text-[20px] font-medium">
                Organização
              </div>
              <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
                Dados do escritório e assinatura.
              </p>
              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                {cfg.org.map((l) => (
                  <div
                    key={l.rot}
                    className="border-line2 flex items-center gap-3.5 border-b px-4 py-3 last:border-b-0"
                  >
                    <span className="text-fg3 w-[120px] flex-none text-[12px]">
                      {l.rot}
                    </span>
                    <span className="flex-1 text-[13px]">{l.val}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {cfg.tab === "plano" ? (
            <>
              <div className="font-display mb-1 text-[20px] font-medium">
                Plano &amp; cobrança
              </div>
              <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
                A cobrança é medida por processos ativos, petições protocoladas
                e assentos.
              </p>

              {/* card do plano */}
              <div
                className="mb-4 flex items-center gap-4 rounded-xl border px-[18px] py-4"
                style={{
                  borderColor:
                    "color-mix(in oklch, var(--primary) 26%, transparent)",
                  background:
                    "color-mix(in oklch, var(--primary) 5%, transparent)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[18px] font-medium">
                      Plano {cfg.plano.nome}
                    </span>
                    <span className="text-fg3 text-[11.5px]">
                      {cfg.plano.ciclo}
                    </span>
                  </div>
                  <div className="text-fg3 mt-[3px] text-[12px]">
                    Base {cfg.plano.base}/mês + excedentes medidos
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className="font-display text-[22px] font-medium tabular-nums">
                    {cfg.plano.proxValor}
                  </div>
                  <div className="text-fg3 text-[10.5px]">
                    {cfg.plano.proxData}
                  </div>
                </div>
                <button
                  onClick={cfg.plano.mudarPlano}
                  className="text-primary border-primary flex-none rounded-lg border bg-transparent px-3.5 py-2 text-[12.5px] font-medium"
                >
                  Mudar de plano
                </button>
              </div>

              {/* uso neste ciclo */}
              <div className="text-fg3 mx-0.5 mt-0 mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase">
                Uso neste ciclo
              </div>
              <div className="mb-5 flex flex-col gap-2.5">
                {cfg.plano.metrica.map((m) => (
                  <div
                    key={m.rot}
                    className="border-line bg-panel rounded-xl border px-4 py-3.5"
                  >
                    <div className="mb-2.5 flex items-baseline gap-2">
                      <span className="text-[13px] font-medium">{m.rot}</span>
                      <span className="text-fg3 text-[11px]">{m.sub}</span>
                      <span className="text-fg2 ml-auto font-mono text-[12px]">
                        {m.uso}
                      </span>
                    </div>
                    <div className="bg-hover h-1.5 overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: m.barPct, background: m.cor }}
                      />
                    </div>
                    <div className="text-fg3 mt-2 text-[11px]">{m.taxa}</div>
                  </div>
                ))}
              </div>

              {/* forma de pagamento */}
              <div className="border-line bg-panel mb-5 flex items-center gap-3 rounded-xl border px-4 py-3">
                <CreditCard
                  className="text-fg2 size-[18px] flex-none"
                  strokeWidth={1.7}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium">
                    Forma de pagamento
                  </span>
                  <span className="text-fg3 block text-[11.5px]">
                    {cfg.plano.pagamento}
                  </span>
                </span>
                <button
                  onClick={cfg.plano.trocarPgto}
                  className="border-line bg-panel text-foreground hover:bg-hover flex-none rounded-[7px] border px-3 py-1.5 text-[12px] font-medium"
                >
                  Trocar
                </button>
              </div>

              {/* faturas */}
              <div className="text-fg3 mx-0.5 mt-0 mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase">
                Faturas
              </div>
              <div className="border-line bg-panel overflow-hidden rounded-xl border">
                {cfg.plano.faturas.map((f) => (
                  <button
                    key={f.mes}
                    onClick={f.onClick}
                    className="border-line2 hover:bg-hover flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">
                        {f.mes}
                      </span>
                      <span className="text-fg3 block text-[11.5px]">
                        {f.det}
                      </span>
                    </span>
                    <span className="flex-none font-mono text-[13px]">
                      {f.valor}
                    </span>
                    <span
                      className="flex-none rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                      style={{ background: f.stBg, color: f.stCor }}
                    >
                      {f.st}
                    </span>
                    <Download
                      className="text-fg3 size-[15px] flex-none"
                      strokeWidth={1.7}
                    />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {cfg.tab === "equipe" ? <ConfigEquipe cfg={cfg} /> : null}
          {cfg.tab === "fontes" ? <ConfigFontes cfg={cfg} /> : null}
          {cfg.tab === "cert" ? <ConfigCert cfg={cfg} /> : null}
          {cfg.tab === "notif" ? <ConfigNotif cfg={cfg} /> : null}
        </div>
      </div>
    </div>
  );
}
