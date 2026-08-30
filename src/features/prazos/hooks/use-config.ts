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

// Sub-abas da tela de Fontes de dados (Integrações / Termos / Ingestões).
export type FontesTab = "integr" | "termos" | "ingest";

// Item da barra de sub-abas de Fontes de dados.
export interface FontesTabItem {
  key: FontesTab;
  label: string;
  ativo: boolean;
  fg: string;
  borda: string;
  peso: number;
  onClick: () => void;
}

// Membro da equipe (avatar iniciais, nome, OAB, papel colorido).
export interface EquipeMembro {
  ini: string;
  nome: string;
  oab: string;
  papel: string;
  papelCor: string;
}

// Toggle genérico (trilho + posição do knob) derivado de um booleano.
export interface ToggleVM {
  trilho: string;
  knob: string;
  onToggle: () => void;
}

// Integração de tribunal/serviço com switch on/off.
export interface Integracao {
  nome: string;
  desc: string;
  toggle: ToggleVM;
}

// Card de resumo (rótulo / valor grande / sublinha).
export interface ResumoCard {
  rot: string;
  val: string;
  sub: string;
}

// Termo vigiado (tipo badge / valor+dono / captura 30d / toggle).
export interface Termo {
  tipo: string;
  tchBg: string;
  tchFg: string;
  valor: string;
  dono: string;
  mono: boolean;
  cap: string;
  capCor: string;
  toggle: ToggleVM;
}

// Linha de varredura/ingestão (data·hora / varridas / novas / status).
export interface Varredura {
  data: string;
  hora: string;
  gatilho: string;
  dur: string;
  varridas: string;
  novas: string;
  st: string;
  stBg: string;
  stCor: string;
  onClick: () => void;
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
  const [fontesTab, setFontesTab] = useState<FontesTab>("integr");

  // Estado on/off das integrações, termos e notificações (UI local efêmera).
  const [integrOn, setIntegrOn] = useState<Record<string, boolean>>({
    djen: true,
    "eproc-tjsp": true,
    pje: true,
    esaj: false,
    projudi: false,
  });
  const [termoOn, setTermoOn] = useState<Record<string, boolean>>({
    t0: true,
    t1: true,
    t2: true,
    t3: false,
    t4: true,
    t5: true,
  });
  const [notifOn, setNotifOn] = useState<Record<string, boolean>>({
    n0: true,
    n1: true,
    n2: false,
  });

  const toggleIn = useCallback(
    (setter: typeof setIntegrOn, key: string) =>
      setter((s) => ({ ...s, [key]: !s[key] })),
    [],
  );

  const emBreve = useCallback((label: string) => {
    toast(`${label} — em breve`);
  }, []);

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

  // ---- Equipe ----
  const convidar = useCallback(() => toast("Convidar membro — em breve"), []);
  const equipe = useMemo<EquipeMembro[]>(
    () => [
      {
        ini: "RM",
        nome: "Ricardo Menezes",
        oab: "OAB/SP 214.885",
        papel: "Administrador",
        papelCor: "var(--primary)",
      },
      {
        ini: "AF",
        nome: "Ana Furtado",
        oab: "OAB/SP 331.204",
        papel: "Advogada",
        papelCor: "var(--fg2)",
      },
      {
        ini: "LC",
        nome: "Lucas Carvalho",
        oab: "OAB/SP 402.117",
        papel: "Advogado",
        papelCor: "var(--fg2)",
      },
      {
        ini: "PT",
        nome: "Priscila Tavares",
        oab: "Estagiária",
        papel: "Estagiária",
        papelCor: "var(--gold)",
      },
      {
        ini: "MB",
        nome: "Marcos Bianchi",
        oab: "Financeiro",
        papel: "Somente leitura",
        papelCor: "var(--fg3)",
      },
    ],
    [],
  );

  // ---- Fontes de dados: sub-abas ----
  const fontesTabs = useMemo<FontesTabItem[]>(() => {
    const items: { key: FontesTab; label: string }[] = [
      { key: "integr", label: "Integrações" },
      { key: "termos", label: "Termos" },
      { key: "ingest", label: "Ingestões" },
    ];
    return items.map((it) => {
      const ativo = it.key === fontesTab;
      return {
        key: it.key,
        label: it.label,
        ativo,
        fg: ativo ? "var(--fg)" : "var(--fg3)",
        borda: ativo ? "var(--primary)" : "transparent",
        peso: ativo ? 500 : 400,
        onClick: () => setFontesTab(it.key),
      };
    });
  }, [fontesTab]);

  // ---- Fontes de dados: Integrações ----
  const integracoes = useMemo<Integracao[]>(
    () =>
      [
        {
          nome: "DJEN",
          desc: "Diário de Justiça Eletrônico Nacional",
          key: "djen",
        },
        {
          nome: "eproc TJSP",
          desc: "Tribunal de Justiça de São Paulo",
          key: "eproc-tjsp",
        },
        { nome: "PJe", desc: "Processo Judicial Eletrônico · CNJ", key: "pje" },
        { nome: "e-SAJ", desc: "Sistema de Automação da Justiça", key: "esaj" },
        { nome: "Projudi", desc: "Processo Judicial Digital", key: "projudi" },
      ].map(({ nome, desc, key }) => ({
        nome,
        desc,
        toggle: toToggle(!!integrOn[key], () => toggleIn(setIntegrOn, key)),
      })),
    [integrOn, toggleIn],
  );

  // ---- Fontes de dados: Termos ----
  const addTermo = useCallback(() => toast("Adicionar termo — em breve"), []);
  const termosResumo = useMemo<ResumoCard[]>(
    () => [
      { rot: "Termos ativos", val: "5", sub: "de 6 cadastrados" },
      { rot: "Captura 30 dias", val: "132", sub: "intimações casadas" },
      { rot: "Cobertura", val: "8", sub: "tribunais vigiados" },
    ],
    [],
  );
  const termos = useMemo<Termo[]>(() => {
    const rows: {
      key: string;
      tipo: string;
      tchBg: string;
      tchFg: string;
      valor: string;
      dono: string;
      mono: boolean;
      cap: string;
      capCor: string;
    }[] = [
      {
        key: "t0",
        tipo: "OAB",
        tchBg: "color-mix(in oklch, var(--primary) 14%, transparent)",
        tchFg: "var(--primary)",
        valor: "OAB/SP 214.885",
        dono: "Ricardo Menezes",
        mono: true,
        cap: "48",
        capCor: "var(--fg)",
      },
      {
        key: "t1",
        tipo: "OAB",
        tchBg: "color-mix(in oklch, var(--primary) 14%, transparent)",
        tchFg: "var(--primary)",
        valor: "OAB/SP 331.204",
        dono: "Ana Furtado",
        mono: true,
        cap: "31",
        capCor: "var(--fg)",
      },
      {
        key: "t2",
        tipo: "NOME",
        tchBg: "color-mix(in oklch, var(--gold) 16%, transparent)",
        tchFg: "var(--gold)",
        valor: "Menezes Advocacia",
        dono: "Razão social",
        mono: false,
        cap: "22",
        capCor: "var(--fg)",
      },
      {
        key: "t3",
        tipo: "CNPJ",
        tchBg: "color-mix(in oklch, var(--green) 16%, transparent)",
        tchFg: "var(--green)",
        valor: "18.442.309/0001-72",
        dono: "Menezes Advocacia",
        mono: true,
        cap: "0",
        capCor: "var(--fg3)",
      },
      {
        key: "t4",
        tipo: "OAB",
        tchBg: "color-mix(in oklch, var(--primary) 14%, transparent)",
        tchFg: "var(--primary)",
        valor: "OAB/SP 402.117",
        dono: "Lucas Carvalho",
        mono: true,
        cap: "19",
        capCor: "var(--fg)",
      },
      {
        key: "t5",
        tipo: "CNPJ",
        tchBg: "color-mix(in oklch, var(--green) 16%, transparent)",
        tchFg: "var(--green)",
        valor: "42.118.007/0001-05",
        dono: "Bianchi Participações",
        mono: true,
        cap: "12",
        capCor: "var(--fg)",
      },
    ];
    return rows.map((r) => ({
      tipo: r.tipo,
      tchBg: r.tchBg,
      tchFg: r.tchFg,
      valor: r.valor,
      dono: r.dono,
      mono: r.mono,
      cap: r.cap,
      capCor: r.capCor,
      toggle: toToggle(!!termoOn[r.key], () => toggleIn(setTermoOn, r.key)),
    }));
  }, [termoOn, toggleIn]);

  // ---- Fontes de dados: Ingestões / Varreduras ----
  const forcarIngest = useCallback(() => toast("Varrendo agora…"), []);
  const ingestResumo = useMemo<ResumoCard[]>(
    () => [
      { rot: "Última varredura", val: "há 2h", sub: "hoje · 06:00" },
      { rot: "Peças varridas (24h)", val: "3.842", sub: "em 4 varreduras" },
      { rot: "Novas intimações", val: "11", sub: "nas últimas 24h" },
    ],
    [],
  );
  const ingestoes = useMemo<Varredura[]>(
    () =>
      [
        {
          data: "30 ago",
          hora: "06:00",
          gatilho: "Agendada",
          dur: "38s",
          varridas: "1.204",
          novas: "4",
          st: "Concluída",
          ok: true,
        },
        {
          data: "29 ago",
          hora: "18:00",
          gatilho: "Agendada",
          dur: "41s",
          varridas: "988",
          novas: "3",
          st: "Concluída",
          ok: true,
        },
        {
          data: "29 ago",
          hora: "12:14",
          gatilho: "Manual",
          dur: "35s",
          varridas: "742",
          novas: "2",
          st: "Concluída",
          ok: true,
        },
        {
          data: "29 ago",
          hora: "06:00",
          gatilho: "Agendada",
          dur: "—",
          varridas: "0",
          novas: "0",
          st: "Falhou",
          ok: false,
        },
        {
          data: "28 ago",
          hora: "18:00",
          gatilho: "Agendada",
          dur: "44s",
          varridas: "1.108",
          novas: "6",
          st: "Concluída",
          ok: true,
        },
        {
          data: "28 ago",
          hora: "06:00",
          gatilho: "Agendada",
          dur: "37s",
          varridas: "1.017",
          novas: "5",
          st: "Concluída",
          ok: true,
        },
      ].map((g) => ({
        data: g.data,
        hora: g.hora,
        gatilho: g.gatilho,
        dur: g.dur,
        varridas: g.varridas,
        novas: g.novas,
        st: g.st,
        stBg: g.ok
          ? "color-mix(in oklch, var(--green) 15%, transparent)"
          : "color-mix(in oklch, var(--red) 15%, transparent)",
        stCor: g.ok ? "var(--green)" : "var(--red)",
        onClick: () => toast(`Varredura ${g.data} ${g.hora} — em breve`),
      })),
    [],
  );

  // ---- Certificados digitais ----
  const enviarCert = useCallback(
    () => toast("Enviar certificado A1 — em breve"),
    [],
  );
  const certificados = useMemo<Certificado[]>(
    () => [
      {
        label: "Ricardo Menezes",
        tipo: "A1",
        validade: "válido até 14/03/2027",
        status: "Ativo",
        statusFundo: "color-mix(in oklch, var(--green) 15%, transparent)",
        statusCor: "var(--green)",
      },
      {
        label: "Menezes Advocacia",
        tipo: "A1",
        validade: "válido até 02/11/2026",
        status: "Ativo",
        statusFundo: "color-mix(in oklch, var(--green) 15%, transparent)",
        statusCor: "var(--green)",
      },
      {
        label: "Ana Furtado",
        tipo: "A3",
        validade: "expira em 22/09/2026",
        status: "Expira em breve",
        statusFundo: "color-mix(in oklch, var(--gold) 16%, transparent)",
        statusCor: "var(--gold)",
      },
    ],
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
    emBreve,
    iniciais: "RM",
    // equipe
    equipe,
    convidar,
    // fontes de dados
    fontesTab,
    fontesTabs,
    integracoes,
    termosResumo,
    termos,
    addTermo,
    ingestResumo,
    ingestoes,
    forcarIngest,
    // certificados
    certificados,
    enviarCert,
    // notificações
    notif,
  };
}
