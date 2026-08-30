"use client";

import { useMemo, useState } from "react";

// Aba ativa da tela de configurações. (Notificações saiu por ora; Plano &
// cobrança está como "Em breve".)
export type ConfigTab =
  "perfil" | "org" | "plano" | "equipe" | "fontes" | "cert";

// Item da sub-nav esquerda (Perfil / Organização / Plano & cobrança / ...).
export interface ConfigNavItem {
  key: ConfigTab;
  label: string;
  ativo: boolean;
  bg: string;
  fg: string;
  peso: number;
  onClick: () => void;
}

// Toggle genérico (trilho + posição do knob) — consumido por ConfigToggle e
// pelas abas que têm switches (ex.: Fontes › Termos).
export interface ToggleVM {
  trilho: string;
  knob: string;
  onToggle: () => void;
}

const TABS: { key: ConfigTab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "org", label: "Organização" },
  { key: "plano", label: "Plano & cobrança" },
  { key: "equipe", label: "Equipe" },
  { key: "fontes", label: "Fontes de dados" },
  { key: "cert", label: "Certificados digitais" },
];

// Hook público da tela de Configurações — guarda só a aba ativa (UI local).
// Cada aba puxa o próprio estado real do respectivo hook/feature.
export function useConfig() {
  const [tab, setTab] = useState<ConfigTab>("perfil");

  const nav = useMemo<ConfigNavItem[]>(
    () =>
      TABS.map((t) => {
        const ativo = t.key === tab;
        return {
          key: t.key,
          label: t.label,
          ativo,
          bg: ativo ? "var(--selected)" : "transparent",
          fg: ativo ? "var(--fg)" : "var(--fg2)",
          peso: ativo ? 500 : 400,
          onClick: () => setTab(t.key),
        };
      }),
    [tab],
  );

  return { tab, nav };
}
