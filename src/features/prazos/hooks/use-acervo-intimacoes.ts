"use client";

import { useMemo, useState } from "react";

import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type {
  IntimacaoType,
  IntimacaoUserStatus,
  IntimacaoView,
} from "@/features/intimacoes/types";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
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

// Rótulos pt-BR do Status = work_stage (estágio derivado no BE). Ordem = progressão
// do ciclo; o filtro usa este enum fixo (o envelope não expõe opções de work_stage).
const WORK_STAGE_LABEL: Record<string, string> = {
  RECEIVED: "Recebida",
  AWAITING_CONFIRMATION: "A confirmar",
  CONFIRMED: "Confirmado",
  DRAFTING: "Em elaboração",
  PARTNER_REVIEW: "Revisão do sócio",
  FILED: "Protocolado",
};

const WORK_STAGE_OPTIONS: FilterOption[] = Object.entries(WORK_STAGE_LABEL).map(
  ([value, label]) => ({ value, label }),
);

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

// Providência exibida: title do BE (label manual > réu+CNJ > classe·assunto,
// docs/erd-motor-de-prazos-v1.md) — mesma fonte usada em toda a UI, nunca
// derivado de novo aqui (Regra nº1: uma só fonte de verdade).
function providenciaLabel(i: IntimacaoView): string {
  return i.title.trim() || "—";
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
  const [court, setCourt] = useState("");
  const [workStage, setWorkStage] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const membros = useOrgMembersDirectory();

  const q = useIntimacoes({
    urgencia: urgenciaWire(urgencia),
    court: court || undefined,
    workStage: workStage || undefined,
    assignee: responsavel || undefined,
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

  // 3 facetas do design: Responsável · Status (work_stage) · Órgão (Tribunal).
  const filtros = useMemo<AcervoFiltro[]>(() => {
    const fs: AcervoFiltro[] = [];
    if (membros.members.length > 0) {
      fs.push({
        key: "responsavel",
        label: "Responsável",
        icon: "responsavel",
        value: responsavel,
        options: [
          { label: "Todos", value: "" },
          ...membros.members.map((m) => ({
            value: m.id,
            label: nomeExibicao(m.name, m.email),
          })),
        ],
        onChange: setResponsavel,
      });
    }
    fs.push({
      key: "work_stage",
      label: "Status",
      icon: "situacao",
      value: workStage,
      options: [{ label: "Todos", value: "" }, ...WORK_STAGE_OPTIONS],
      onChange: setWorkStage,
    });
    const courts = q.filters["court"] ?? [];
    if (courts.length > 0) {
      fs.push({
        key: "court",
        label: "Órgão",
        icon: "tribunal",
        value: court,
        options: [{ label: "Todos", value: "" }, ...courts],
        onChange: setCourt,
      });
    }
    return fs;
  }, [q.filters, membros.members, responsavel, workStage, court]);

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
