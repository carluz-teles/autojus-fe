"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspaceList } from "@/features/action-items/hooks/use-workspace";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { hojeISO } from "@/features/shared/db";
import { useApi } from "@/lib/api/use-api";

import {
  buildDia,
  buildMes,
  buildSemana,
  type CalEvento,
  DIAS_SEMANA,
  tituloDia,
  tituloMes,
  toISODate,
} from "../lib/calendario";
import {
  prazoParaEvento,
  providenciaParaEvento,
} from "../lib/calendario-eventos";
import { listPrazos } from "../services/prazos.service";

// Modos do calendário (estilo Google). O NAV traz pra rota /calendario; aqui o
// toggle Mês/Semana/Dia é UI local efêmera (useState), não server state.
export type CalModo = "mes" | "semana" | "dia";

// Janela ampla numa só chamada (o calendário não pagina — é agenda de trabalho).
// Cobre o volume esperado de prazos/providências ativas de um escritório.
const PAGE_SIZE = 300;

// ── mapeamento real → evento de calendário ───────────────────────────────────
// Prazo entra na DATA FATAL (end_date), com os dias já calculados pelo BE
// (days_left). Providência entra no VENCIMENTO (due_date) quando houver — sem
// due_date não tem onde cair no calendário (só aparece na Fila).

// ── sub-hook: modo (Mês / Semana / Dia) ───────────────────────────────────────
function useModo() {
  const [modo, setModo] = useState<CalModo>("mes");
  return {
    modo,
    setMes: useCallback(() => setModo("mes"), []),
    setSemana: useCallback(() => setModo("semana"), []),
    setDia: useCallback(() => setModo("dia"), []),
    ehMes: modo === "mes",
    ehSemana: modo === "semana",
    ehDia: modo === "dia",
  };
}

// ── sub-hook: data de referência (mês/semana/dia correntes, navegáveis) ───────
// DINÂMICA: nasce em HOJE (new Date()), e prev/next andam por mês, semana ou dia
// conforme o modo ativo. "Hoje" volta pra data real corrente.
function useReferencia(modo: CalModo) {
  const [ref, setRef] = useState<Date>(() => new Date());

  const anda = useCallback(
    (delta: number) =>
      setRef((cur) => {
        const d = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
        if (modo === "mes") d.setMonth(d.getMonth() + delta);
        else if (modo === "semana") d.setDate(d.getDate() + delta * 7);
        else d.setDate(d.getDate() + delta);
        return d;
      }),
    [modo],
  );

  return {
    ref,
    prev: useCallback(() => anda(-1), [anda]),
    next: useCallback(() => anda(1), [anda]),
    hoje: useCallback(() => setRef(new Date()), []),
  };
}

// Hook público do Calendário — compõe os sub-hooks e devolve tudo bindável.
// Datas dinâmicas (mês/semana/dia correntes) e dado REAL: prazos (GET /v1/prazos
// numa janela ampla ao redor de hoje) + providências (GET /v1/action-items).
export function usePrazosCalendario() {
  const fetcher = useApi();
  const modo = useModo();
  const referencia = useReferencia(modo.modo);
  const { nameFor } = useOrgMembersDirectory();

  const hoje = hojeISO();

  // Fetch the visible month and adjacent days; navigation changes the query.
  const janela = useMemo(() => {
    const ref = referencia.ref;
    return {
      from: toISODate(new Date(ref.getFullYear(), ref.getMonth(), -6)),
      to: toISODate(new Date(ref.getFullYear(), ref.getMonth() + 1, 7)),
    };
  }, [referencia.ref]);
  const prazosQuery = useInfiniteQuery({
    queryKey: ["calendario", "prazos", janela],
    queryFn: ({ pageParam }) =>
      listPrazos(fetcher, {
        ...janela,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor || undefined,
  });
  const providenciasQuery = useWorkspaceList({ ...janela, status: "ACTIVE" });
  const { hasNextPage, isFetching, isError, fetchNextPage } = prazosQuery;
  const {
    hasMore,
    isFetching: fetchingWork,
    isError: errorWork,
    loadMore,
  } = providenciasQuery;
  useEffect(() => {
    if (hasNextPage && !isFetching && !isError)
      void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetching, isError, fetchNextPage]);
  useEffect(() => {
    if (hasMore && !fetchingWork && !errorWork) loadMore();
  }, [hasMore, fetchingWork, errorWork, loadMore]);

  const eventos = useMemo<CalEvento[]>(() => {
    const dePrazos = (
      prazosQuery.data?.pages.flatMap((page) => page.data) ?? []
    )
      .map(prazoParaEvento)
      .filter((e): e is CalEvento => e !== null);
    const deProvidencias = providenciasQuery.items
      .filter((p) => p.status !== "DONE")
      .map((p) => providenciaParaEvento(p, hoje, nameFor(p.assignee_user_id)))
      .filter((e): e is CalEvento => e !== null);
    return [...dePrazos, ...deProvidencias];
  }, [prazosQuery.data, providenciasQuery.items, hoje, nameFor]);

  const mes = useMemo(
    () => buildMes(eventos, referencia.ref, hoje),
    [eventos, referencia.ref, hoje],
  );
  const semana = useMemo(
    () => buildSemana(eventos, referencia.ref, hoje),
    [eventos, referencia.ref, hoje],
  );
  const dia = useMemo(
    () => buildDia(eventos, referencia.ref),
    [eventos, referencia.ref],
  );

  const titulo = modo.ehDia
    ? tituloDia(referencia.ref)
    : modo.ehSemana
      ? `Semana · ${tituloMes(referencia.ref)}`
      : tituloMes(referencia.ref);

  return {
    isLoading: prazosQuery.isLoading || providenciasQuery.isPending,
    titulo,
    diasSemana: DIAS_SEMANA,
    modo: modo.modo,
    ehMes: modo.ehMes,
    ehSemana: modo.ehSemana,
    ehDia: modo.ehDia,
    setMes: modo.setMes,
    setSemana: modo.setSemana,
    setDia: modo.setDia,
    prev: referencia.prev,
    next: referencia.next,
    hoje: referencia.hoje,
    mes,
    semana,
    dia,
  };
}
