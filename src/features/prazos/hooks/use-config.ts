"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// Aba ativa da tela de configurações. Todas as abas têm conteúdo portado do
// template (1276-1485).
export type ConfigTab =
  "perfil" | "org" | "plano" | "equipe" | "fontes" | "cert" | "notif";

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

// Linha rótulo↔valor (Perfil / Organização).
export interface ConfigRow {
  rot: string;
  val: string;
}

// Métrica de uso do plano (barra de progresso + taxa).
export interface PlanoMetrica {
  rot: string;
  sub: string;
  uso: string;
  barPct: string;
  cor: string;
  taxa: string;
}

// Fatura na lista de cobrança.
export interface PlanoFatura {
  mes: string;
  det: string;
  valor: string;
  st: string;
  stBg: string;
  stCor: string;
  onClick: () => void;
}

// View-model do plano: card + uso medido + pagamento + faturas.
export interface PlanoVM {
  nome: string;
  ciclo: string;
  base: string;
  proxValor: string;
  proxData: string;
  pagamento: string;
  metrica: PlanoMetrica[];
  faturas: PlanoFatura[];
  mudarPlano: () => void;
  trocarPgto: () => void;
}

// Toggle genérico (trilho + posição do knob) derivado de um booleano.
export interface ToggleVM {
  trilho: string;
  knob: string;
  onToggle: () => void;
}

// Certificado digital (label, tipo·validade, status badge).
export interface Certificado {
  label: string;
  tipo: string;
  validade: string;
  status: string;
  statusFundo: string;
  statusCor: string;
}

// Linha de notificação (rótulo/descrição + toggle).
export interface NotifLinha {
  rot: string;
  val: string;
  toggle: ToggleVM;
}

const TABS: { key: ConfigTab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "org", label: "Organização" },
  { key: "plano", label: "Plano & cobrança" },
  { key: "equipe", label: "Equipe" },
  { key: "fontes", label: "Fontes de dados" },
  { key: "cert", label: "Certificados digitais" },
  { key: "notif", label: "Notificações" },
];

// Deriva um ToggleVM (trilho colorido + posição do knob) de um booleano ligado.
function toToggle(on: boolean, onToggle: () => void): ToggleVM {
  return {
    trilho: on ? "var(--primary)" : "var(--line2)",
    knob: on ? "translateX(16px)" : "translateX(0)",
    onToggle,
  };
}

// Hook público da tela de Configurações. Sem server state — o conteúdo é mock
// estático; useState só guarda a aba ativa (UI local). O componente só faz bind.
export function useConfig() {
  const [tab, setTab] = useState<ConfigTab>("perfil");

  // Estado on/off das notificações (UI local efêmera).
  const [notifOn, setNotifOn] = useState<Record<string, boolean>>({
    n0: true,
    n1: true,
    n2: false,
  });

  const toggleIn = useCallback(
    (setter: typeof setNotifOn, key: string) =>
      setter((s) => ({ ...s, [key]: !s[key] })),
    [],
  );

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

  const perfil = useMemo<ConfigRow[]>(
    () => [
      { rot: "Nome", val: "Ricardo Menezes" },
      { rot: "E-mail", val: "ricardo@menezesadv.com.br" },
      { rot: "OAB", val: "OAB/SP 214.885" },
      { rot: "Telefone", val: "(11) 98842-0117" },
      { rot: "Cargo", val: "Sócio · Advogado responsável" },
    ],
    [],
  );

  const org = useMemo<ConfigRow[]>(
    () => [
      { rot: "Escritório", val: "Menezes Advocacia" },
      { rot: "CNPJ", val: "18.442.309/0001-72" },
      { rot: "Assinatura", val: "Menezes Advocacia — OAB/SP 214.885" },
      { rot: "Endereço", val: "Av. Paulista, 1842 · cj. 92 · São Paulo/SP" },
    ],
    [],
  );

  const plano = useMemo<PlanoVM>(
    () => ({
      nome: "Escritório",
      ciclo: "ciclo mensal",
      base: "R$ 890",
      proxValor: "R$ 1.240",
      proxData: "próx. cobrança 12 set",
      pagamento: "Visa •••• 4218 · exp. 08/27",
      metrica: [
        {
          rot: "Processos ativos",
          sub: "monitorados no ciclo",
          uso: "148 / 200",
          barPct: "74%",
          cor: "var(--primary)",
          taxa: "R$ 3,50 por processo excedente",
        },
        {
          rot: "Petições protocoladas",
          sub: "protocolos concluídos",
          uso: "62 / 80",
          barPct: "78%",
          cor: "var(--green)",
          taxa: "R$ 6,00 por protocolo excedente",
        },
        {
          rot: "Assentos gerados",
          sub: "movimentações registradas",
          uso: "310 / 300",
          barPct: "100%",
          cor: "var(--gold)",
          taxa: "R$ 0,40 por assento excedente",
        },
      ],
      faturas: [
        {
          mes: "Agosto 2026",
          det: "12 ago · fatura #2026-08",
          valor: "R$ 1.180",
          st: "Paga",
          stBg: "color-mix(in oklch, var(--green) 15%, transparent)",
          stCor: "var(--green)",
          onClick: () => toast("Baixando fatura de agosto…"),
        },
        {
          mes: "Julho 2026",
          det: "12 jul · fatura #2026-07",
          valor: "R$ 1.045",
          st: "Paga",
          stBg: "color-mix(in oklch, var(--green) 15%, transparent)",
          stCor: "var(--green)",
          onClick: () => toast("Baixando fatura de julho…"),
        },
        {
          mes: "Junho 2026",
          det: "12 jun · fatura #2026-06",
          valor: "R$ 980",
          st: "Paga",
          stBg: "color-mix(in oklch, var(--green) 15%, transparent)",
          stCor: "var(--green)",
          onClick: () => toast("Baixando fatura de junho…"),
        },
      ],
      mudarPlano: () => toast("Mudar de plano — em breve"),
      trocarPgto: () => toast("Trocar forma de pagamento — em breve"),
    }),
    [],
  );

  const trocarFoto = useCallback(() => toast("Trocar foto — em breve"), []);
  const editarPerfil = useCallback(
    (rot: string) => toast(`Editar ${rot} — em breve`),
    [],
  );

  // ---- Notificações ----
  const notif = useMemo(
    () => ({
      titulo: "Notificações",
      desc: "Como e quando avisamos você sobre prazos e intimações.",
      linhas: [
        {
          rot: "Novas intimações",
          val: "Aviso por e-mail assim que uma intimação chega.",
          key: "n0",
        },
        {
          rot: "Resumo diário",
          val: "Digest às 08:00 com prazos do dia e pendências.",
          key: "n1",
        },
        {
          rot: "Alertas por SMS",
          val: "SMS para prazos fatais nas próximas 48h.",
          key: "n2",
        },
      ].map(({ rot, val, key }) => ({
        rot,
        val,
        toggle: toToggle(!!notifOn[key], () => toggleIn(setNotifOn, key)),
      })) as NotifLinha[],
    }),
    [notifOn, toggleIn],
  );

  return {
    tab,
    nav,
    perfil,
    org,
    plano,
    trocarFoto,
    editarPerfil,
    iniciais: "RM",
    // notificações
    notif,
  };
}
