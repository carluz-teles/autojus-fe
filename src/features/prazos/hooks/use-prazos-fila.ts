"use client";

import { useMemo, useState } from "react";

import { useActionItems } from "@/features/action-items/hooks/use-action-items";
import { STATUS_LABEL } from "@/features/action-items/lib/status-pill";
import type { ActionItemView } from "@/features/action-items/types";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { iniciais, nomeExibicao } from "@/features/organization/lib/labels";
import { diasRestantes, rotuloPrazo } from "@/features/shared/prazo";

import { cnjCurto, urg, type UrgKey } from "../lib/derivar";

// Fila / Meus Prazos ligadas a GET /v1/action-items (real). "Meus Prazos" trava
// assignee="me" (o BE resolve pelo JWT); a Fila deixa "Todos" ou uma pílula de
// responsável (id interno, via useOrgMembersDirectory).

// Janela única (sem "carregar mais" nessa tela — é fila de trabalho, não
// histórico). Cobre o volume esperado de providências ativas de um escritório.
const FILA_PAGE_SIZE = 200;
const TETO = 25;

// Item de uma faixa da fila: ActionItemView decorado pra bind direto na UI.
export interface FilaItem {
  id: string;
  providencia: string;
  status: ActionItemView["status"];
  statusLabel: string;
  dias: number | null;
  prazoLabel: string;
  urgCor: string;
  urgK: UrgKey;
  cnjCurto: string;
  court: string;
  respLabel: string;
  respIniciais: string;
  href: string;
}

// Faixa de prioridade da fila (Vencidos / Esta semana / Depois).
export interface FilaGrupo {
  label: string;
  cor: string;
  prioK: UrgKey;
  n: number;
  itens: FilaItem[];
  extra: string;
  temExtra: boolean;
}

// Pílula de filtro por responsável (escondida no "Meus Prazos").
export interface FilaFiltro {
  label: string;
  ativo: boolean;
  bg: string;
  fg: string;
  borda: string;
  onClick: () => void;
}

// Faixas fixas em DIAS CORRIDOS. Providência sem due_date (dias null) cai em "Depois".
const GDEFS: {
  label: string;
  cor: string;
  prioK: UrgKey;
  test: (dias: number | null) => boolean;
}[] = [
  {
    label: "Vencidos / vencem hoje",
    cor: "var(--red)",
    prioK: "critico",
    test: (dias) => dias !== null && dias <= 0,
  },
  {
    label: "Esta semana",
    cor: "var(--gold)",
    prioK: "atencao",
    test: (dias) => dias !== null && dias > 0 && dias <= 5,
  },
  {
    label: "Depois",
    cor: "var(--fg3)",
    prioK: "tranquilo",
    test: (dias) => dias === null || dias > 5,
  },
];

// Dias corridos até o vencimento, contra HOJE real. null = sem due_date.
function diasDaProvidencia(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return diasRestantes(
    dueDate.slice(0, 10),
    new Date().toISOString().slice(0, 10),
  );
}

function decorar(
  p: ActionItemView,
  nameFor: (id: string | undefined | null) => string | null,
): FilaItem {
  const dias = diasDaProvidencia(p.due_date);
  const u = urg(dias ?? Number.POSITIVE_INFINITY);
  const nome = nameFor(p.assignee_user_id);
  return {
    id: p.id,
    providencia: p.title,
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    dias,
    prazoLabel: rotuloPrazo(dias),
    urgCor: u.cor,
    urgK: u.k,
    cnjCurto: p.cnj_number ? cnjCurto(p.cnj_number) : "",
    court: p.court ?? "",
    respLabel: nome ?? "—",
    respIniciais: nome ? iniciais(nome) : "—",
    href: `/providencias/${p.id}`,
  };
}

// ── sub-hook: estado do filtro por responsável ────────────────────────────────
// Quando meus=true ("Meus Prazos"), o assignee fica travado em "me" (o BE
// resolve pelo JWT) e o próprio componente esconde a linha de pílulas.
function useFilaResp(meus: boolean) {
  const [respId, setRespId] = useState<string | undefined>(undefined);
  const efetivo = meus ? "me" : respId;
  return { respId, efetivo, setRespId };
}

// Hook público da Fila — compõe os sub-hooks e devolve tudo bindável.
export function usePrazosFila(meus = false) {
  const filtro = useFilaResp(meus);
  const directory = useOrgMembersDirectory();

  // Sem filtro de status: a fila de trabalho mostra TODO + WORKING; excluímos
  // DONE client-side (a fila é "o que ainda precisa ser feito", não histórico).
  const query = useActionItems({
    assignee: filtro.efetivo,
    pageSize: FILA_PAGE_SIZE,
  });

  const ativas = useMemo(
    () => query.providencias.filter((p) => p.status !== "DONE"),
    [query.providencias],
  );

  const grupos = useMemo<FilaGrupo[]>(
    () =>
      GDEFS.map((g) => {
        const decorados = ativas
          .filter((p) => g.test(diasDaProvidencia(p.due_date)))
          .map((p) => decorar(p, directory.nameFor))
          .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity));
        return {
          label: g.label,
          cor: g.cor,
          prioK: g.prioK,
          n: decorados.length,
          itens: decorados.slice(0, TETO),
          extra: (decorados.length - TETO).toLocaleString("pt-BR"),
          temExtra: decorados.length > TETO,
        };
      }).filter((g) => g.n > 0),
    [ativas, directory.nameFor],
  );

  const filtros = useMemo<FilaFiltro[]>(() => {
    if (meus) return [];
    const opcoes: { id: string | undefined; label: string }[] = [
      { id: undefined, label: "Todos" },
      ...directory.members.map((m) => ({
        id: m.id,
        label: nomeExibicao(m.name, m.email).split(" ")[0] || "—",
      })),
    ];
    return opcoes.map((o) => {
      const ativo = filtro.respId === o.id;
      return {
        label: o.label,
        ativo,
        bg: ativo ? "var(--fg)" : "var(--panel)",
        fg: ativo ? "var(--bg)" : "var(--fg2)",
        borda: ativo ? "var(--fg)" : "var(--line)",
        onClick: () => filtro.setRespId(o.id),
      };
    });
  }, [meus, directory.members, filtro]);

  return {
    isLoading: query.isPending,
    isError: !!query.error,
    grupos,
    filtros,
    podeFiltroResp: !meus,
    total: ativas.length.toLocaleString("pt-BR"),
  };
}
