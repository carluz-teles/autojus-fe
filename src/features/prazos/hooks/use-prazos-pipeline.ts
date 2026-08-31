"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { canMove, dec, ORDEM, type PrazoDec, stageLabel } from "../lib/derivar";
import { type PrazoMock, type PrazoStage } from "../mocks/prazos.mock";
import { listPrazos, moverEstagio } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// ── sub-hook: overrides de estágio (arrastar cards no Board) ───────────────────
function useStageOverrides() {
  const [overrides, setOverrides] = useState<Record<string, PrazoStage>>({});
  const aplica = useCallback(
    (base: PrazoMock[]) =>
      base.map((p) => (overrides[p.id] ? { ...p, stage: overrides[p.id] } : p)),
    [overrides],
  );
  const set = useCallback(
    (id: string, stage: PrazoStage) =>
      setOverrides((o) => ({ ...o, [id]: stage })),
    [],
  );
  return { aplica, set };
}

// ── sub-hook: estado do drag-and-drop (HTML5 nativo, como no mockup) ──────────
function useDnD() {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<PrazoStage | null>(null);
  return { dragId, setDragId, hoverCol, setHoverCol };
}

export interface BoardCard extends PrazoDec {
  temFlag: boolean;
  flag: string;
  flagCor: string;
  flagFundo: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export interface BoardColumn {
  key: PrazoStage;
  label: string;
  n: number;
  cards: BoardCard[];
  extra: number;
  temExtra: boolean;
  vazia: boolean;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export interface FunilEtapa {
  key: PrazoStage;
  label: string;
  n: number;
  pct: string;
  barW: string;
  cor: string;
  gargalo: boolean;
}

// Bandeira do card (divergência/IA) — sinaliza o que trava o avanço.
function flagDe(p: PrazoMock) {
  if (p.origem === "divergente")
    return {
      temFlag: true,
      flag: "divergência",
      flagCor: "var(--gold)",
      flagFundo: "color-mix(in oklch, var(--gold) 14%, transparent)",
    };
  if (p.origem === "ia")
    return {
      temFlag: true,
      flag: "IA",
      flagCor: "var(--primary)",
      flagFundo: "color-mix(in oklch, var(--primary) 11%, transparent)",
    };
  return { temFlag: false, flag: "", flagCor: "", flagFundo: "" };
}

// Hook público do Pipeline — compõe overrides + DnD e devolve funil + board.
export function usePrazosPipeline() {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });
  const stages = useStageOverrides();
  const dnd = useDnD();

  const todos = useMemo(
    () => stages.aplica(query.data ?? []),
    [query.data, stages],
  );

  const tentarMover = useCallback(
    (id: string, to: PrazoStage) => {
      const item = todos.find((p) => p.id === id);
      const v = canMove(item, to);
      if (v.silent) return;
      if (v.ok) {
        void moverEstagio(id, to).then(() => stages.set(id, to));
        if (v.msg) toast.success(v.msg);
      } else if (v.reason) {
        toast.warning(v.reason);
      }
    },
    [todos, stages],
  );

  const colunas = useMemo<BoardColumn[]>(
    () =>
      ORDEM.map((key) => {
        const itens = todos.filter((p) => p.stage === key);
        return {
          key,
          label: stageLabel(key),
          n: itens.length,
          cards: itens.slice(0, 8).map((p): BoardCard => ({
            ...dec(p),
            ...flagDe(p),
            dragging: dnd.dragId === p.id,
            onDragStart: () => dnd.setDragId(p.id),
            onDragEnd: () => {
              dnd.setDragId(null);
              dnd.setHoverCol(null);
            },
          })),
          extra: Math.max(0, itens.length - 8),
          temExtra: itens.length > 8,
          vazia: itens.length === 0,
          isDropTarget: dnd.hoverCol === key && dnd.dragId !== null,
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            if (dnd.hoverCol !== key) dnd.setHoverCol(key);
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            if (dnd.dragId) tentarMover(dnd.dragId, key);
            dnd.setDragId(null);
            dnd.setHoverCol(null);
          },
        };
      }),
    [todos, dnd, tentarMover],
  );

  const funil = useMemo<FunilEtapa[]>(() => {
    const ativos = todos.filter((p) => p.stage !== "protocolado");
    const total = ativos.length || 1;
    const max = Math.max(
      ...ORDEM.map((k) => todos.filter((p) => p.stage === k).length),
      1,
    );
    const cores: Record<PrazoStage, string> = {
      intimacao: "var(--fg3)",
      confirmar: "var(--gold)",
      confirmado: "var(--blue)",
      elaboracao: "var(--primary)",
      revisao: "var(--gold)",
      protocolado: "var(--green)",
    };
    return ORDEM.map((key) => {
      const n = todos.filter((p) => p.stage === key).length;
      return {
        key,
        label: stageLabel(key),
        n,
        pct: Math.round((n / total) * 100) + "%",
        barW: Math.round((n / max) * 100) + "%",
        cor: cores[key],
        gargalo: key === "confirmar" && n / total > 0.35,
      };
    });
  }, [todos]);

  const totalAtivos = useMemo(
    () => todos.filter((p) => p.stage !== "protocolado").length,
    [todos],
  );

  return {
    isLoading: query.isLoading,
    colunas,
    funil,
    totalAtivos: totalAtivos.toLocaleString("pt-BR"),
    arrastando: dnd.dragId !== null,
  };
}
