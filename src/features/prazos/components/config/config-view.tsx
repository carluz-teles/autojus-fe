"use client";

import { Clock } from "lucide-react";

import { useConfig } from "../../hooks/use-config";
import { ConfigCert } from "./config-cert";
import { ConfigEquipe } from "./config-equipe";
import { ConfigFontes } from "./config-fontes";
import { ConfigOrg } from "./config-org";
import { ConfigPerfil } from "./config-perfil";

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
          {cfg.tab === "perfil" ? <ConfigPerfil /> : null}
          {cfg.tab === "org" ? <ConfigOrg /> : null}

          {cfg.tab === "plano" ? (
            <>
              <div className="font-display mb-1 text-[20px] font-medium">
                Plano &amp; cobrança
              </div>
              <p className="text-fg3 mt-0 mb-[18px] text-[12.5px]">
                Planos e faturamento do escritório.
              </p>
              <div className="border-line bg-panel flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
                <span className="border-line text-fg3 grid size-11 place-items-center rounded-full border">
                  <Clock className="size-5" strokeWidth={1.7} />
                </span>
                <div className="text-[14px] font-medium">Em breve</div>
                <p className="text-fg3 max-w-[320px] text-[12.5px] leading-[1.5]">
                  A gestão de plano, uso e faturas chega em uma próxima
                  atualização.
                </p>
              </div>
            </>
          ) : null}

          {cfg.tab === "equipe" ? <ConfigEquipe /> : null}
          {cfg.tab === "fontes" ? <ConfigFontes /> : null}
          {cfg.tab === "cert" ? <ConfigCert /> : null}
        </div>
      </div>
    </div>
  );
}
