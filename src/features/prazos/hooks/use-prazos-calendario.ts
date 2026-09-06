"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useActionItems } from "@/features/action-items/hooks/use-action-items";
import type { ActionItemView } from "@/features/action-items/types";
import { hojeISO } from "@/features/shared/db";
import { diasRestantes } from "@/features/shared/prazo";
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
import { listPrazos } from "../services/prazos.service";
import type { PrazoAgendaView } from "../types";

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

function cnjCurto(cnj: string | undefined): string {
  return cnj ? cnj.slice(0, 11) + "." : "";
}

function subDe(cnj: string | undefined, court: string | undefined): string {
  return [cnjCurto(cnj), court].filter(Boolean).join(" · ");
}

function prazoParaEvento(p: PrazoAgendaView): CalEvento | null {
  if (!p.end_date) return null;
  return {
    id: `prazo-${p.id}`,
    tipo: "prazo",
    titulo: "Prazo fatal",
    sub: subDe(p.cnj_number, p.court),
    dia: p.end_date.slice(0, 10),
    dias: p.days_left,
    href: `/intimacoes/${p.intimation_id}`,
  };
}

function providenciaParaEvento(
  p: ActionItemView,
  hoje: string,
): CalEvento | null {
  if (!p.due_date) return null;
  const dia = p.due_date.slice(0, 10);
  return {
    id: `prov-${p.id}`,
    tipo: "providencia",
    titulo: p.title,
    sub: subDe(p.cnj_number, p.court),
    dia,
    dias: diasRestantes(dia, hoje),
    href: `/providencias/${p.id}`,
  };
}

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

// ── sub-hook: conexão Google Agenda (MOCK, máquina de estado local) ───────────
// Era mock no design; segue mock (sem integração real). Máquina de estado
// puramente client-side — nenhuma chamada de rede.
type GoogleEstado = "idle" | "conectando" | "conectado";

function useGoogle() {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<GoogleEstado>("idle");
  const [sync, setSync] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const conectar = useCallback(() => {
    setEstado("conectando");
    timer.current = setTimeout(() => setEstado("conectado"), 1100);
  }, []);

  return {
    aberto,
    idle: estado === "idle",
    conectando: estado === "conectando",
    conectado: estado === "conectado",
    sync,
    abrir: useCallback(() => setAberto(true), []),
    fechar: useCallback(() => setAberto(false), []),
    conectar,
    toggleSync: useCallback(() => setSync((s) => !s), []),
    adicionarTodos: useCallback(
      () => toast.success("Prazos enviados para a Google Agenda"),
      [],
    ),
    exportarIcs: useCallback(() => toast("Arquivo .ics exportado"), []),
    desconectar: useCallback(() => setEstado("idle"), []),
  };
}

// Hook público do Calendário — compõe os sub-hooks e devolve tudo bindável.
// Datas dinâmicas (mês/semana/dia correntes) e dado REAL: prazos (GET /v1/prazos
// numa janela ampla ao redor de hoje) + providências (GET /v1/action-items).
export function usePrazosCalendario() {
  const fetcher = useApi();
  const modo = useModo();
  const referencia = useReferencia(modo.modo);
  const google = useGoogle();

  const hoje = hojeISO();

  // Janela ampla ao redor de hoje (±6 meses) — cobre a navegação sem refetch a
  // cada troca de mês. Fixa no mount (não em cada render) pra a queryKey ser estável.
  const janela = useMemo(() => {
    const de = new Date();
    de.setMonth(de.getMonth() - 6);
    const ate = new Date();
    ate.setMonth(ate.getMonth() + 6);
    return { from: toISODate(de), to: toISODate(ate) };
  }, []);

  const prazosQuery = useQuery({
    queryKey: ["calendario", "prazos", janela],
    queryFn: () =>
      listPrazos(fetcher, {
        from: janela.from,
        to: janela.to,
        limit: PAGE_SIZE,
      }),
  });

  const providenciasQuery = useActionItems({ pageSize: PAGE_SIZE });

  const eventos = useMemo<CalEvento[]>(() => {
    const dePrazos = (prazosQuery.data?.data ?? [])
      .map(prazoParaEvento)
      .filter((e): e is CalEvento => e !== null);
    const deProvidencias = providenciasQuery.providencias
      .filter((p) => p.status !== "DONE")
      .map((p) => providenciaParaEvento(p, hoje))
      .filter((e): e is CalEvento => e !== null);
    return [...dePrazos, ...deProvidencias];
  }, [prazosQuery.data, providenciasQuery.providencias, hoje]);

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
    google,
  };
}
