"use client";

import { Settings2 } from "lucide-react";

import { ShellHeader } from "@/components/shell/page-frame";
import { BillingPanel } from "@/features/billing/components/billing-panel";
import { NotificationPreferences } from "@/features/notifications/notification-preferences";
import { cn } from "@/lib/utils";

import { useConfig } from "../../hooks/use-config";
import { ConfigEquipe } from "./config-equipe";
import { ConfigFontes } from "./config-fontes";
import { SettingsSection } from "./config-kit";
import { ConfigOrg } from "./config-org";
import { ConfigPerfil } from "./config-perfil";

// Tela de Configurações (rebranding), port do template 1262-1491: sub-nav
// esquerda (~232px) + painel de conteúdo que troca por aba. Perfil / Organização
// / Plano ficam inline; Equipe / Fontes / Certificados / Notificações vêm de
// componentes dedicados neste diretório.
export function ConfigView() {
  const cfg = useConfig();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ShellHeader>
        <Settings2
          aria-hidden
          className="text-fg2 size-4 shrink-0"
          strokeWidth={1.8}
        />
        <h1 className="text-[13px] font-medium">Configurações</h1>
      </ShellHeader>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* sub-nav de configurações */}
        <nav
          aria-label="Seções de configurações"
          className="border-line bg-panel flex shrink-0 gap-1 overflow-x-auto border-b px-2.5 py-2 md:block md:w-[232px] md:overflow-y-auto md:border-r md:border-b-0 md:py-4"
        >
          <div className="section-label hidden px-2.5 pt-1 pb-2.5 md:block">
            Configurações
          </div>
          {cfg.nav.map((t) => (
            <button
              key={t.key}
              onClick={t.onClick}
              aria-current={t.ativo ? "page" : undefined}
              className={cn(
                "mb-0.5 flex min-h-8 shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] whitespace-nowrap transition-colors md:w-full pointer-coarse:min-h-11",
                t.ativo
                  ? "bg-selected text-foreground font-medium"
                  : "text-fg2 hover:bg-hover hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* conteúdo */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="max-w-[680px] px-4 pt-7 pb-28 sm:px-8">
            {cfg.tab === "perfil" ? <ConfigPerfil /> : null}
            {cfg.tab === "org" ? <ConfigOrg /> : null}

            {cfg.tab === "plano" ? (
              <SettingsSection
                title="Plano & cobrança"
                subtitle="Planos e faturamento do escritório."
              >
                <BillingPanel />
              </SettingsSection>
            ) : null}

            {cfg.tab === "equipe" ? <ConfigEquipe /> : null}
            {cfg.tab === "fontes" ? <ConfigFontes /> : null}
            {cfg.tab === "notificacoes" ? (
              <div className="reveal">
                <NotificationPreferences />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
