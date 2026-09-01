"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { dec, LANES, type PrazoDec } from "../lib/derivar";
import {
  EQUIPE,
  ORGAOS,
  type PrazoMock,
  USUARIO_ATUAL,
} from "../mocks/prazos.mock";
import { confirmarLote, listPrazos } from "../services/prazos-triagem.service";

export const prazosKeys = {
  all: ["prazos-triagem"] as const,
};

// Query base compartilhada por Inbox e Pipeline (server state via TanStack Query).
function usePrazosQuery() {
  return useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });
}

// Contadores da view p/ a top-bar (viewContagem do mockup). Lê a MESMA query
// (dedup pelo cache), sem refetch. Inbox = precisa triar; Pipeline = ativos.
export function usePrazosContagem() {
  const query = usePrazosQuery();
  const todos = query.data ?? [];
  const inbox = todos.filter(
    (p) => p.stage === "confirmar" || p.origem === "semprazo",
  ).length;
  const pipeline = todos.filter((p) => p.stage !== "protocolado").length;
  return { inbox, pipeline };
}

interface FiltrosState {
  resp: string | null;
  orgao: string | null;
}

// ── sub-hook: filtros (responsável / órgão) + menus ───────────────────────────
function useFiltros() {
  const [filtros, setFiltros] = useState<FiltrosState>({
    resp: null,
    orgao: null,
  });
  const [menu, setMenu] = useState<null | "resp" | "orgao">(null);

  const aplica = useCallback(
    (base: PrazoMock[]) =>
      base.filter(
        (p) =>
          (!filtros.resp || p.resp === filtros.resp) &&
          (!filtros.orgao || p.orgao === filtros.orgao),
      ),
    [filtros],
  );

  return { filtros, setFiltros, menu, setMenu, aplica };
}

// ── sub-hook: saved views (escopo rápido da triagem) ─────────────────────────
type Scope = "todos" | "meus" | "urgentes" | "semprazo";

function useScope() {
  const [scope, setScope] = useState<Scope>("todos");
  const aplica = useCallback(
    (base: PrazoMock[]) => {
      if (scope === "meus") return base.filter((p) => p.resp === USUARIO_ATUAL);
      if (scope === "urgentes") return base.filter((p) => p.dias <= 3);
      if (scope === "semprazo")
        return base.filter((p) => p.origem === "semprazo");
      return base;
    },
    [scope],
  );
  return { scope, setScope, aplica };
}

// ── sub-hook: seleção em lote ─────────────────────────────────────────────────
function useSelecao() {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const toggle = useCallback(
    (id: string) => setSel((s) => ({ ...s, [id]: !s[id] })),
    [],
  );
  const limpar = useCallback(() => setSel({}), []);
  return { sel, toggle, limpar };
}

// ── sub-hook: lanes colapsáveis ───────────────────────────────────────────────
function useLanesUI() {
  const [aberta, setAberta] = useState<string>("divergencia");
  const toggle = useCallback(
    (key: string) => setAberta((cur) => (cur === key ? "" : key)),
    [],
  );
  return { aberta, toggle };
}

// ── sub-hook: item em foco (peek) + navegação J/K ─────────────────────────────
function useFoco(lista: PrazoMock[]) {
  const [focoId, setFocoId] = useState<string | null>(null);
  const [resolveAberto, setResolveAberto] = useState(false);

  const idx = lista.findIndex((p) => p.id === focoId);
  const foco = idx >= 0 ? lista[idx] : lista[0];

  const mover = useCallback(
    (delta: number) => {
      if (lista.length === 0) return;
      const base = lista.findIndex((p) => p.id === (foco?.id ?? null));
      const next = Math.max(0, Math.min(lista.length - 1, base + delta));
      setFocoId(lista[next].id);
      setResolveAberto(false);
    },
    [lista, foco],
  );

  return {
    foco,
    focar: (id: string) => {
      setFocoId(id);
      setResolveAberto(false);
    },
    proximo: () => mover(1),
    anterior: () => mover(-1),
    resolveAberto,
    abrirResolve: () => setResolveAberto(true),
    fecharResolve: () => setResolveAberto(false),
  };
}

export interface InboxLane {
  key: string;
  label: string;
  cor: string;
  bulkLabel: string;
  n: number;
  aberta: boolean;
  itens: PrazoDec[];
  extra: number;
  temExtra: boolean;
  onToggle: () => void;
  onBulk: () => void;
}

// Hook público da Inbox — compõe os sub-hooks e devolve tudo bindável. O
// componente só faz JSX + binding (regra do CLAUDE.md).
export function usePrazosInbox() {
  const query = usePrazosQuery();
  const filtros = useFiltros();
  const scope = useScope();
  const selecao = useSelecao();
  const lanesUI = useLanesUI();

  const [confirmados, setConfirmados] = useState<Record<string, boolean>>({});

  const todos = useMemo(() => query.data ?? [], [query.data]);

  // A Inbox trata a triagem: só o que precisa de decisão (não confirmado ainda).
  // Aplica escopo (saved view) + filtros (responsável/órgão) sobre o universo.
  const pendentes = useMemo(() => {
    const base = scope.aplica(filtros.aplica(todos));
    return base
      .filter((p) => !confirmados[p.id] && p.stage === "confirmar")
      .concat(
        base.filter((p) => !confirmados[p.id] && p.origem === "semprazo"),
      );
  }, [todos, filtros, scope, confirmados]);

  const foco = useFoco(pendentes);

  const lanes = useMemo<InboxLane[]>(
    () =>
      LANES.map((def) => {
        const itens = pendentes.filter(def.test);
        return {
          key: def.key,
          label: def.label,
          cor: def.cor,
          bulkLabel: def.bulkLabel,
          n: itens.length,
          aberta: lanesUI.aberta === def.key,
          itens: itens.slice(0, 6).map(dec),
          extra: Math.max(0, itens.length - 6),
          temExtra: itens.length > 6,
          onToggle: () => lanesUI.toggle(def.key),
          onBulk: () => {
            const ids = itens.filter((p) => selecao.sel[p.id]).map((p) => p.id);
            const alvo = ids.length ? ids : itens.map((p) => p.id);
            void confirmarLote(alvo).then((done) => {
              setConfirmados((c) => {
                const next = { ...c };
                done.forEach((id) => (next[id] = true));
                return next;
              });
              selecao.limpar();
              toast.success(
                def.key === "semprazo"
                  ? `Ciência dada a ${alvo.length} intimações`
                  : `${alvo.length} prazos confirmados em lote`,
              );
            });
          },
        };
      }).filter((l) => l.n > 0),
    [pendentes, lanesUI, selecao],
  );

  const resumo = useMemo(() => {
    const total = filtros.aplica(todos).length;
    const precisa = pendentes.length;
    return {
      total: total.toLocaleString("pt-BR"),
      precisa: precisa.toLocaleString("pt-BR"),
    };
  }, [todos, pendentes, filtros]);

  const respItens = useMemo(
    () =>
      ["Todos", ...EQUIPE].map((nome) => ({
        label: nome,
        ativo:
          nome === "Todos"
            ? !filtros.filtros.resp
            : filtros.filtros.resp === nome,
        onSelect: () =>
          filtros.setFiltros((f) => ({
            ...f,
            resp: nome === "Todos" ? null : nome,
          })),
      })),
    [filtros],
  );

  const orgaoItens = useMemo(
    () =>
      ["Todos", ...ORGAOS].map((org) => ({
        label: org,
        ativo:
          org === "Todos"
            ? !filtros.filtros.orgao
            : filtros.filtros.orgao === org,
        onSelect: () =>
          filtros.setFiltros((f) => ({
            ...f,
            orgao: org === "Todos" ? null : org,
          })),
      })),
    [filtros],
  );

  // Saved views (pills de escopo rápido), fiéis ao mockup: pílula ativa recebe
  // borda/fundo/cor de accent; as demais ficam neutras.
  const savedViews = useMemo(() => {
    const defs: { key: Scope; label: string }[] = [
      { key: "todos", label: "Todos" },
      { key: "meus", label: "Meus" },
      { key: "urgentes", label: "Urgentes" },
      { key: "semprazo", label: "Sem prazo" },
    ];
    return defs.map((d) => {
      const ativo = scope.scope === d.key;
      return {
        key: d.key,
        label: d.label,
        ativo,
        borda: ativo
          ? "color-mix(in oklch, var(--primary) 40%, transparent)"
          : "var(--line)",
        bg: ativo
          ? "color-mix(in oklch, var(--primary) 9%, transparent)"
          : "var(--panel)",
        fg: ativo ? "var(--primary)" : "var(--fg2)",
        onClick: () => scope.setScope(d.key),
      };
    });
  }, [scope]);

  const focoDec = foco.foco ? dec(foco.foco) : null;

  return {
    isLoading: query.isLoading,
    resumo,
    lanes,
    savedViews,
    filtros: {
      resp: filtros.filtros.resp,
      orgao: filtros.filtros.orgao,
      hasFilter: !!(filtros.filtros.resp || filtros.filtros.orgao),
      menu: filtros.menu,
      abrirResp: () => filtros.setMenu((m) => (m === "resp" ? null : "resp")),
      abrirOrgao: () =>
        filtros.setMenu((m) => (m === "orgao" ? null : "orgao")),
      fecharMenu: () => filtros.setMenu(null),
      respLabel: filtros.filtros.resp
        ? filtros.filtros.resp.split(" ")[0]
        : "Responsável",
      orgaoLabel: filtros.filtros.orgao ?? "Órgão",
      respItens,
      orgaoItens,
      limpar: () => filtros.setFiltros({ resp: null, orgao: null }),
    },
    sel: selecao.sel,
    toggleSel: selecao.toggle,
    foco: focoDec
      ? {
          ...focoDec,
          nota: foco.foco?.nota ?? "",
          temNota: !!foco.foco?.nota,
          resolveAberto: foco.resolveAberto,
          ehDivergente: foco.foco?.origem === "divergente",
          abrirResolve: foco.abrirResolve,
          fecharResolve: foco.fecharResolve,
          confirmar: () => {
            if (!foco.foco) return;
            if (foco.foco.origem === "divergente" && !foco.resolveAberto) {
              foco.abrirResolve();
              return;
            }
            void confirmarLote([foco.foco.id]).then(() => {
              setConfirmados((c) => ({ ...c, [foco.foco!.id]: true }));
              toast.success("Prazo confirmado");
              foco.proximo();
            });
          },
        }
      : null,
    proximo: foco.proximo,
    anterior: foco.anterior,
    focar: foco.focar,
    vazio: pendentes.length === 0,
  };
}
