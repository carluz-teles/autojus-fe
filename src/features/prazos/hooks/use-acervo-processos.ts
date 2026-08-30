"use client";

import { useMemo, useState } from "react";

import { useProcessos } from "@/features/processos/hooks/use-processos";
import type { ProcessoView } from "@/features/processos/types";
import type { FilterOption } from "@/lib/api/types";

// Iniciais de um nome (até 2 letras). "—" quando sem responsável.
function iniciais(nome: string | null): string {
  if (!nome) return "—";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

// Tempo relativo pt-BR a partir de um RFC3339 (ou null). "—" quando ausente.
function tempoRelativo(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

// Grau (degree) em rótulo pt-BR. Aceita string (o value cru da faceta) além do
// enum ProcessoDegree — o switch cai no default para valores desconhecidos.
function grauLabel(degree: string): string {
  switch (degree) {
    case "G1":
      return "1º grau";
    case "G2":
      return "2º grau";
    case "JE":
      return "Juizado";
    case "SUPERIOR":
      return "Superior";
    default:
      return "—";
  }
}

// Ciclo de vida (lifecycle) → rótulo + cor. Fallback preserva o valor cru.
function situacao(lifecycle: string): { label: string; cor: string } {
  switch (lifecycle) {
    case "ACTIVE":
      return { label: "Em andamento", cor: "var(--green)" };
    case "SUSPENDED":
      return { label: "Suspenso", cor: "var(--gold)" };
    case "ARCHIVED":
      return { label: "Arquivado", cor: "var(--fg3)" };
    default:
      return { label: lifecycle || "—", cor: "var(--fg2)" };
  }
}

// Opções de lifecycle usadas quando o BE não emite a faceta no envelope.
const LIFECYCLE_FALLBACK: FilterOption[] = [
  { label: "Em andamento", value: "ACTIVE" },
  { label: "Suspenso", value: "SUSPENDED" },
  { label: "Arquivado", value: "ARCHIVED" },
  { label: "Baixado", value: "BAIXADO" },
];

// Rótulos pt-BR das facetas conhecidas (para o popover de filtros).
const FACET_LABELS: Record<string, string> = {
  lifecycle: "Situação",
  court: "Tribunal",
  degree: "Grau",
  assignee: "Responsável",
};

// Ícone (chave lida pelo TableFilter) de cada faceta.
const FACET_ICONS: Record<string, string> = {
  lifecycle: "situacao",
  court: "tribunal",
  degree: "grau",
  assignee: "responsavel",
};

// Ordem de exibição dos filtros no popover.
const FACET_ORDER = ["lifecycle", "court", "degree", "assignee"] as const;

// Reetiqueta as opções de uma faceta com rótulos pt-BR quando conhecemos o
// enum (lifecycle/degree); tribunal/responsável já vêm legíveis do BE.
function rotulaOpcoes(key: string, facet: FilterOption[]): FilterOption[] {
  if (key === "lifecycle")
    return facet.map((o) => ({
      value: o.value,
      label: situacao(o.value).label,
    }));
  if (key === "degree")
    return facet.map((o) => ({
      value: o.value,
      label: grauLabel(o.value) === "—" ? o.label : grauLabel(o.value),
    }));
  return facet;
}

// Uma linha de exibição do Acervo · Processos.
export interface AcervoProcessoRow {
  id: string;
  cnjCurto: string;
  classe: string;
  assunto: string;
  orgao: string;
  grau: string;
  resp: string;
  respIniciais: string;
  situacao: string;
  situacaoCor: string;
  ultimaMov: string;
}

// Descrição de um filtro do popover (só facetas presentes no envelope).
export interface AcervoFiltro {
  key: string;
  label: string;
  icon: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}

function mapRow(p: ProcessoView): AcervoProcessoRow {
  const s = situacao(p.lifecycle);
  return {
    id: p.id,
    cnjCurto: p.cnj_number,
    classe: p.class || "—",
    assunto: p.subject || "—",
    orgao: p.judging_body || p.court || "—",
    grau: grauLabel(p.degree),
    resp: p.assigned_user_name || "—",
    respIniciais: iniciais(p.assigned_user_name),
    situacao: s.label,
    situacaoCor: s.cor,
    ultimaMov: tempoRelativo(p.last_movement_at),
  };
}

// Hook público do Acervo · Processos. Detém o estado dos filtros (UI-local),
// injeta em useProcessos (server state real) e deriva o VM. O componente só faz
// JSX + binding.
export function useAcervoProcessos() {
  const [lifecycle, setLifecycle] = useState("");
  const [court, setCourt] = useState("");
  const [degree, setDegree] = useState("");
  const [assignee, setAssignee] = useState("");

  const {
    processos,
    filters,
    totalCount,
    isPending,
    isFetching,
    error,
    search,
    setSearch,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useProcessos({ lifecycle, court, degree, assignee });

  const rows = useMemo<AcervoProcessoRow[]>(
    () => processos.map(mapRow),
    [processos],
  );

  const filtros = useMemo<AcervoFiltro[]>(() => {
    const valores: Record<string, string> = {
      lifecycle,
      court,
      degree,
      assignee,
    };
    const setters: Record<string, (v: string) => void> = {
      lifecycle: setLifecycle,
      court: setCourt,
      degree: setDegree,
      assignee: setAssignee,
    };

    return FACET_ORDER.flatMap((key) => {
      const facet =
        key === "lifecycle"
          ? (filters.lifecycle ?? LIFECYCLE_FALLBACK)
          : filters[key];
      if (!facet?.length) return [];

      const options: FilterOption[] = [
        { label: "Todos", value: "" },
        ...rotulaOpcoes(key, facet),
      ];

      return [
        {
          key,
          label: FACET_LABELS[key] ?? key,
          icon: FACET_ICONS[key] ?? "situacao",
          value: valores[key] ?? "",
          options,
          onChange: setters[key],
        },
      ];
    });
  }, [filters, lifecycle, court, degree, assignee]);

  return {
    rows,
    search,
    setSearch,
    isLoading: isPending,
    isFetching,
    isError: !!error,
    totalLabel: totalCount.toLocaleString("pt-BR"),
    hasMore,
    isLoadingMore,
    loadMore: () => {
      loadMore();
    },
    filtros,
  };
}
