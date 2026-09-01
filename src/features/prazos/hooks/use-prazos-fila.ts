"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { dec, type PrazoDec, stageLabel } from "../lib/derivar";
import { EQUIPE } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// Item de uma faixa da fila: PrazoMock decorado + rótulo do estágio + abrir.
export interface FilaItem extends PrazoDec {
  stageLabel: string;
  onOpen: () => void;
}

// Faixa de prioridade da fila (Vencidos / Esta semana / Depois).
export interface FilaGrupo {
  label: string;
  cor: string;
  prioK: "critico" | "atencao" | "tranquilo";
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

// Faixas fixas — port de _filaView (gdefs). Cada uma casa dias↔prioridade e cor.
const GDEFS: {
  label: string;
  cor: string;
  prioK: FilaGrupo["prioK"];
  test: (dias: number) => boolean;
}[] = [
  {
    label: "Vencidos / vencem hoje",
    cor: "var(--red)",
    prioK: "critico",
    test: (dias) => dias <= 0,
  },
  {
    label: "Esta semana",
    cor: "var(--gold)",
    prioK: "atencao",
    test: (dias) => dias > 0 && dias <= 5,
  },
  {
    label: "Depois",
    cor: "var(--fg3)",
    prioK: "tranquilo",
    test: (dias) => dias > 5,
  },
];

const TETO = 25;

// ── sub-hook: estado do filtro por responsável ────────────────────────────────
// Quando forcarResp existe ("Meus Prazos"), o responsável fica travado no usuário
// e o próprio componente esconde a linha de pílulas (podeFiltroResp = false).
function useFilaResp(forcarResp?: string) {
  const [resp, setResp] = useState<string>("Todos");
  const efetivo = forcarResp || resp;
  return { resp, efetivo, setResp };
}

// Hook público da Fila — compõe o sub-hook e devolve tudo bindável. O componente
// só faz JSX + binding (regra do CLAUDE.md).
export function usePrazosFila(forcarResp?: string) {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });
  const filtro = useFilaResp(forcarResp);

  const todos = useMemo(() => query.data ?? [], [query.data]);

  // Universo da fila: prazos em andamento (exclui protocolado), opcionalmente
  // restrito ao responsável selecionado (ou forçado, no "Meus Prazos").
  const base = useMemo(() => {
    const emAndamento = todos.filter((p) => p.stage !== "protocolado");
    return filtro.efetivo === "Todos"
      ? emAndamento
      : emAndamento.filter((p) => p.resp === filtro.efetivo);
  }, [todos, filtro.efetivo]);

  const abrir = useCallback((it: PrazoDec) => {
    toast(`${it.providencia} — ${it.cliente}`);
  }, []);

  const grupos = useMemo<FilaGrupo[]>(
    () =>
      GDEFS.map((g) => {
        const its = base
          .filter((p) => g.test(p.dias))
          .sort((a, b) => a.dias - b.dias);
        return {
          label: g.label,
          cor: g.cor,
          prioK: g.prioK,
          n: its.length,
          itens: its.slice(0, TETO).map((p) => {
            const d = dec(p);
            return {
              ...d,
              stageLabel: stageLabel(p.stage),
              onOpen: () => abrir(d),
            };
          }),
          extra: (its.length - TETO).toLocaleString("pt-BR"),
          temExtra: its.length > TETO,
        };
      }).filter((g) => g.n > 0),
    [base, abrir],
  );

  const filtros = useMemo<FilaFiltro[]>(
    () =>
      ["Todos", ...EQUIPE].map((a) => {
        const ativo = filtro.resp === a;
        return {
          label: a === "Todos" ? "Todos" : a.split(" ")[0],
          ativo,
          bg: ativo ? "var(--fg)" : "var(--panel)",
          fg: ativo ? "var(--bg)" : "var(--fg2)",
          borda: ativo ? "var(--fg)" : "var(--line)",
          onClick: () => filtro.setResp(a),
        };
      }),
    [filtro],
  );

  return {
    isLoading: query.isLoading,
    grupos,
    filtros,
    podeFiltroResp: !forcarResp,
    total: base.length.toLocaleString("pt-BR"),
  };
}
