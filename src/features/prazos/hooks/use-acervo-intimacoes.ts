"use client";

import { useMemo, useState } from "react";

import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type {
  IntimacaoType,
  IntimacaoUserStatus,
  IntimacaoView,
} from "@/features/intimacoes/types";
import type { FilterOption } from "@/lib/api/types";

// ── Chave de bucket de urgência (nomes do IntimacoesBuckets; "" = Todas). ──
type BucketKey =
  | ""
  | "atraso"
  | "hoje"
  | "proximos_dois_dias"
  | "esta_semana"
  | "este_mes"
  | "sem_data_definida";

// Mapa bucket→wire value do param ?urgencia= (esta_semana vira "semana"; "" some).
function urgenciaWire(key: BucketKey): string | undefined {
  if (!key) return undefined;
  if (key === "esta_semana") return "semana";
  return key;
}

// ── Linha de exibição do feed (tudo derivado — o componente só faz binding). ──
export interface AcervoIntimacaoRow {
  id: string;
  publicado: string;
  providencia: string;
  cnjCurto: string;
  tipoLabel: string;
  origem: string;
  statusLabel: string;
  statusCor: string;
  prazoLabel: string;
  prazoCor: string;
}

export interface AcervoTab {
  key: BucketKey;
  label: string;
  count: number;
  ativo: boolean;
  onClick: () => void;
}

export interface AcervoFiltro {
  key: string;
  label: string;
  icon: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

const TIPO_LABEL: Record<IntimacaoType, string> = {
  INTIMACAO: "Intimação",
  CITACAO: "Citação",
  COMUNICACAO: "Comunicação",
};

const STATUS_LABEL: Record<IntimacaoUserStatus, string> = {
  PENDING: "Pendente",
  RESOLVED: "Resolvida",
  IGNORED: "Ignorada",
};

const STATUS_COR: Record<IntimacaoUserStatus, string> = {
  PENDING: "var(--gold)",
  RESOLVED: "var(--green)",
  IGNORED: "var(--fg3)",
};

// Rótulo humano das facetas emitidas pelo envelope (só rendemos as presentes).
const FACET_LABEL: Record<string, string> = {
  type: "Tipo",
  court: "Tribunal",
  user_status: "Situação",
};

// Ícone (chave lida pelo TableFilter) de cada faceta.
const FACET_ICON: Record<string, string> = {
  type: "tipo",
  court: "tribunal",
  user_status: "situacao",
};

const FACET_ORDER = ["type", "court", "user_status"] as const;

// Reetiqueta opções com rótulo pt-BR quando conhecemos o enum (type/user_status).
function rotulaOpcoes(key: string, facet: FilterOption[]): FilterOption[] {
  if (key === "type")
    return facet.map((o) => ({
      value: o.value,
      label: TIPO_LABEL[o.value as IntimacaoType] ?? o.label,
    }));
  if (key === "user_status")
    return facet.map((o) => ({
      value: o.value,
      label: STATUS_LABEL[o.value as IntimacaoUserStatus] ?? o.label,
    }));
  return facet;
}

// Ordem + rótulo das tabs de urgência (Todas primeiro).
const TAB_DEFS: { key: BucketKey; label: string }[] = [
  { key: "", label: "Todas" },
  { key: "atraso", label: "Em atraso" },
  { key: "hoje", label: "Hoje" },
  { key: "proximos_dois_dias", label: "Próximos 2 dias" },
  { key: "esta_semana", label: "Esta semana" },
  { key: "este_mes", label: "Este mês" },
  { key: "sem_data_definida", label: "Sem data" },
];

// Data curta pt-BR (dd/mm) a partir de um RFC3339; "" quando inválida/ausente.
function dataCurta(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Tempo relativo enxuto ("hoje", "3d", "12/03") a partir da publicação.
function publicadoLabel(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `${dias}d`;
  return dataCurta(iso);
}

function truncar(texto: string, max = 90): string {
  const t = texto.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// Providência exibida: assunto → prévia truncada → classe → "—".
function providenciaLabel(i: IntimacaoView): string {
  if (i.subject.trim()) return i.subject.trim();
  if (i.content_preview.trim()) return truncar(i.content_preview);
  if (i.class.trim()) return i.class.trim();
  return "—";
}

function prazoLabelCor(i: IntimacaoView): { label: string; cor: string } {
  const p = i.prazo;
  if (!p) return { label: "—", cor: "var(--fg3)" };
  if (p.days_left < 0)
    return { label: `${-p.days_left}d atraso`, cor: "var(--red)" };
  if (p.days_left === 0) return { label: "hoje", cor: "var(--gold)" };
  return { label: `${p.days_left}d`, cor: "var(--fg2)" };
}

function toRow(i: IntimacaoView): AcervoIntimacaoRow {
  const prazo = prazoLabelCor(i);
  return {
    id: i.id,
    publicado: publicadoLabel(i.published_at || i.made_available_at),
    providencia: providenciaLabel(i),
    cnjCurto: i.cnj_number,
    tipoLabel: TIPO_LABEL[i.type] ?? i.type,
    origem: i.court || "—",
    statusLabel: STATUS_LABEL[i.user_status] ?? i.user_status,
    statusCor: STATUS_COR[i.user_status] ?? "var(--fg3)",
    prazoLabel: prazo.label,
    prazoCor: prazo.cor,
  };
}

/**
 * Hook público do Acervo · Intimações — VM completa do feed sobre o backend real.
 * Estado de filtro (urgência + facetas) vive local (useState); o server state vem
 * de useIntimacoes. O componente chama só este hook e faz JSX + binding.
 */
export function useAcervoIntimacoes() {
  const [urgencia, setUrgencia] = useState<BucketKey>("");
  const [type, setType] = useState("");
  const [court, setCourt] = useState("");
  const [userStatus, setUserStatus] = useState("");

  const q = useIntimacoes({
    urgencia: urgenciaWire(urgencia),
    type: type || undefined,
    court: court || undefined,
    user_status: userStatus || undefined,
  });

  const rows = useMemo(() => q.intimacoes.map(toRow), [q.intimacoes]);

  const tabs = useMemo<AcervoTab[]>(() => {
    const b = q.buckets;
    const totalTodas =
      b.atraso +
      b.hoje +
      b.proximos_dois_dias +
      b.esta_semana +
      b.este_mes +
      b.sem_data_definida;
    return TAB_DEFS.map(({ key, label }) => ({
      key,
      label,
      count: key === "" ? totalTodas : (b[key] ?? 0),
      ativo: key === urgencia,
      onClick: () => setUrgencia(key),
    }));
  }, [q.buckets, urgencia]);

  const filtros = useMemo<AcervoFiltro[]>(() => {
    const setters: Record<string, [string, (v: string) => void]> = {
      type: [type, setType],
      court: [court, setCourt],
      user_status: [userStatus, setUserStatus],
    };
    return FACET_ORDER.filter((k) => q.filters[k]?.length).map((k) => {
      const [value, onChange] = setters[k];
      const options = q.filters[k] ?? [];
      return {
        key: k,
        label: FACET_LABEL[k] ?? k,
        icon: FACET_ICON[k] ?? "situacao",
        value,
        options: [{ label: "Todos", value: "" }, ...rotulaOpcoes(k, options)],
        onChange,
      };
    });
  }, [q.filters, type, court, userStatus]);

  return {
    rows,
    search: q.search,
    setSearch: q.setSearch,
    isLoading: q.isPending,
    isFetching: q.isFetching,
    isError: !!q.error,
    totalLabel: q.totalCount.toLocaleString("pt-BR"),
    tabs,
    filtros,
    hasMore: q.hasMore,
    isLoadingMore: q.isLoadingMore,
    loadMore: q.loadMore,
  };
}
