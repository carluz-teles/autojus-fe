"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCaptures } from "@/features/captures/hooks/use-captures";
import {
  useAddWatchedOab,
  useIntegrations,
  useToggleWatchedOab,
  useWatchedOabs,
} from "@/features/integrations/hooks/use-integrations";

// Aba "Fontes de dados" ligada ao BE real (ingestão). Compõe os sub-hooks de
// React Query já existentes das features de aquisição:
//  · Integrações  → GET /v1/acquisition/integrations (read-only; sem toggle no BE)
//  · Termos       → GET/POST/PATCH /v1/acquisition/watched-oabs (lista + ligar/add)
//  · Ingestões    → GET /v1/acquisition/captures (runs + resumo; auto-poll se rodando)
// Componente = JSX + binding; toda a lógica/derivação vive aqui.
export type FontesTab = "integr" | "termos" | "ingest";

export interface FontesTabItem {
  key: FontesTab;
  label: string;
  ativo: boolean;
  fg: string;
  borda: string;
  peso: number;
  onClick: () => void;
}

export interface ToggleVM {
  trilho: string;
  knob: string;
  onToggle: () => void;
}

export interface ResumoCard {
  rot: string;
  val: string;
  sub: string;
}

export interface IntegracaoVM {
  id: string;
  nome: string;
  desc: string;
  status: string;
  statusFg: string;
  statusBg: string;
}

export interface TermoVM {
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

export interface VarreduraVM {
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

const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

// Metadados de exibição por source de integração (o BE devolve o enum cru).
const SOURCE_META: Record<string, { nome: string; desc: string }> = {
  DJEN: { nome: "DJEN", desc: "Diário de Justiça Eletrônico Nacional" },
  DATAJUD: {
    nome: "DataJud",
    desc: "Base Nacional de Dados do Poder Judiciário · CNJ",
  },
};

// Rótulo pt-BR do tipo de captura (CaptureKind).
const KIND_LABEL: Record<string, string> = {
  DAILY_CAPTURE: "Agendada",
  ENRICHMENT: "Enriquecimento",
  INITIAL_LOAD: "Carga inicial",
  CATCH_UP: "Religada",
};

// Cores do badge de status da varredura (CaptureDisplayStatus).
const STATUS_CORES: Record<string, { fg: string; bg: string }> = {
  Concluída: {
    fg: "var(--green)",
    bg: "color-mix(in oklch, var(--green) 14%, transparent)",
  },
  "Concluída com avisos": {
    fg: "var(--gold)",
    bg: "color-mix(in oklch, var(--gold) 16%, transparent)",
  },
  "Falha parcial": {
    fg: "var(--red)",
    bg: "color-mix(in oklch, var(--red) 14%, transparent)",
  },
  "Em andamento": {
    fg: "var(--blue)",
    bg: "color-mix(in oklch, var(--blue) 14%, transparent)",
  },
};

// "SP347019" → "OAB/SP 347.019" (UF + número agrupado em milhares).
function fmtOab(oab: string): string {
  const uf = oab.slice(0, 2).toUpperCase();
  const num = oab.slice(2).replace(/\D/g, "");
  const agrupado = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `OAB/${uf} ${agrupado}`;
}

// Normaliza a OAB digitada no "Adicionar termo" pra chave canônica "UFNUMERO".
function normalizeOab(raw: string): string {
  const semPrefixo = raw.replace(/oab/gi, "");
  const uf = (semPrefixo.match(/[A-Za-z]{2}/)?.[0] ?? "SP").toUpperCase();
  return uf + semPrefixo.replace(/\D/g, "");
}

function fmtDataHora(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  return {
    data: `${d.getDate()} ${MESES[d.getMonth()]}`,
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function fmtDur(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}min ${s}s` : `${m}min`;
}

function relativo(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  return `há ${dias} dia${dias > 1 ? "s" : ""}`;
}

const nf = (n: number) => n.toLocaleString("pt-BR");

export function useFontes() {
  const [fontesTab, setFontesTab] = useState<FontesTab>("integr");

  const integrQuery = useIntegrations();
  const oabsQuery = useWatchedOabs();
  const capturesQuery = useCaptures();
  const toggleOab = useToggleWatchedOab();
  const addOab = useAddWatchedOab();

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

  // ---- Integrações (read-only: o BE não expõe toggle por tribunal) ----
  const integracoes = useMemo<IntegracaoVM[]>(
    () =>
      (integrQuery.data?.data ?? []).map((i) => {
        const meta = SOURCE_META[i.source] ?? {
          nome: i.source,
          desc: "Fonte de dados",
        };
        const conectada = /ACTIVE|CONNECTED|OK|ENABLED/i.test(i.status);
        return {
          id: i.id,
          nome: meta.nome,
          desc: meta.desc,
          status: conectada ? "Conectada" : i.status,
          statusFg: conectada ? "var(--green)" : "var(--fg3)",
          statusBg: conectada
            ? "color-mix(in oklch, var(--green) 14%, transparent)"
            : "var(--hover)",
        };
      }),
    [integrQuery.data],
  );

  // ---- Termos (OABs monitoradas) ----
  const termos = useMemo<TermoVM[]>(
    () =>
      (oabsQuery.data?.data ?? []).map((w) => ({
        tipo: "OAB",
        tchBg: "color-mix(in oklch, var(--primary) 14%, transparent)",
        tchFg: "var(--primary)",
        valor: fmtOab(w.oab),
        dono: w.name ?? "aguardando 1ª captura",
        mono: true,
        cap: w.enabled ? "ativa" : "—",
        capCor: w.enabled ? "var(--fg2)" : "var(--fg3)",
        toggle: {
          trilho: w.enabled ? "var(--primary)" : "var(--line2)",
          knob: w.enabled ? "translateX(16px)" : "translateX(0)",
          onToggle: () =>
            toggleOab.mutate(
              { oab: w.oab, enabled: !w.enabled },
              {
                onError: () =>
                  toast.error("Não foi possível alterar a captura desta OAB."),
              },
            ),
        },
      })),
    [oabsQuery.data, toggleOab],
  );

  const termosResumo = useMemo<ResumoCard[]>(() => {
    const lista = oabsQuery.data?.data ?? [];
    const ativos = lista.filter((w) => w.enabled).length;
    return [
      {
        rot: "Termos ativos",
        val: nf(ativos),
        sub: `de ${nf(lista.length)} cadastrados`,
      },
      {
        rot: "OABs monitoradas",
        val: nf(lista.length),
        sub: "no escopo do DJEN",
      },
      {
        rot: "Pausadas",
        val: nf(lista.length - ativos),
        sub: "sem captura nova",
      },
    ];
  }, [oabsQuery.data]);

  // Adicionar termo (OAB) — inline, ligado ao POST real.
  const [addAberto, setAddAberto] = useState(false);
  const [addValor, setAddValor] = useState("");
  const toggleAddTermo = useCallback(() => {
    setAddAberto((a) => !a);
    setAddValor("");
  }, []);
  const addTermoSubmit = useCallback(() => {
    const oab = normalizeOab(addValor);
    if (oab.length < 4) {
      toast.error("Informe uma OAB válida (ex.: OAB/SP 214.885).");
      return;
    }
    addOab.mutate(oab, {
      onSuccess: () => {
        toast.success("OAB adicionada ao monitoramento.");
        setAddValor("");
        setAddAberto(false);
      },
      onError: () =>
        toast.error("Não foi possível adicionar. Ela já pode estar no escopo."),
    });
  }, [addValor, addOab]);

  // ---- Ingestões / Varreduras ----
  const ingestResumo = useMemo<ResumoCard[]>(() => {
    const s = capturesQuery.data?.summary;
    return [
      {
        rot: "Última captura",
        val: relativo(s?.last_capture_at ?? null),
        sub: s?.last_capture_at ? fmtDataHora(s.last_capture_at).hora : "—",
      },
      {
        rot: "Novas intimações hoje",
        val: nf(s?.intimations_new_today ?? 0),
        sub: "casadas com seus termos",
      },
      {
        rot: "Prazos derivados hoje",
        val: nf(s?.deadlines_derived_today ?? 0),
        sub: s?.next_execution ? `próxima ${s.next_execution}` : "—",
      },
    ];
  }, [capturesQuery.data]);

  const ingestoes = useMemo<VarreduraVM[]>(
    () =>
      (capturesQuery.data?.runs ?? []).map((r) => {
        const { data, hora } = fmtDataHora(r.started_at);
        const cores = STATUS_CORES[r.display_status] ?? {
          fg: "var(--fg2)",
          bg: "var(--hover)",
        };
        return {
          data,
          hora,
          gatilho: KIND_LABEL[r.kind] ?? r.kind,
          dur: fmtDur(r.duration_sec),
          varridas: nf(r.court_records_new + r.court_records_updated),
          novas: nf(r.intimations_new),
          st: r.display_status,
          stBg: cores.bg,
          stCor: cores.fg,
          onClick: () => toast(`${r.source} · ${data} ${hora}`),
        };
      }),
    [capturesQuery.data],
  );

  return {
    fontesTab,
    fontesTabs,
    // integrações
    integracoes,
    integrPending: integrQuery.isPending,
    integrError: !!integrQuery.error,
    // termos
    termos,
    termosResumo,
    termosPending: oabsQuery.isPending,
    termosError: !!oabsQuery.error,
    addAberto,
    addValor,
    setAddValor,
    toggleAddTermo,
    addTermoSubmit,
    addTermoAdicionando: addOab.isPending,
    // ingestões
    ingestoes,
    ingestResumo,
    ingestPending: capturesQuery.isPending,
    ingestError: !!capturesQuery.error,
  };
}
