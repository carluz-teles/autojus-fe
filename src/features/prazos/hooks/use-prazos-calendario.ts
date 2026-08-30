"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { dec, type PrazoDec } from "../lib/derivar";
import type { PrazoMock } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// Modos do calendário (estilo Google). O NAV traz pra rota /prazos/calendario;
// aqui o toggle Mês/Semana/Dia é UI local efêmera (useState), não server state.
export type CalModo = "mes" | "semana" | "dia";

// Mês de referência do mock (fiel ao protótipo): setembro/2026, "hoje" = 02/09.
const DIAS_NAV = ["01/09", "02/09", "03/09", "04/09", "05/09"] as const;
const DOW_MAP: Record<string, string> = {
  "01/09": "segunda-feira",
  "02/09": "terça-feira",
  "03/09": "quarta-feira",
  "04/09": "quinta-feira",
  "05/09": "sexta-feira",
};

// Audiências fixas do protótipo (grade de horas do Dia). Presencial = gold,
// Virtual = primary (marca). dur em minutos.
interface AudDef {
  hora: string;
  dur: number;
  tipo: string;
  cliente: string;
  modal: "Presencial" | "Virtual";
}
const AUD_DEFS: Record<string, AudDef[]> = {
  "02/09": [
    {
      hora: "10:30",
      dur: 90,
      tipo: "Audiência de instrução",
      cliente: "Construtora Vetor",
      modal: "Presencial",
    },
    {
      hora: "15:00",
      dur: 60,
      tipo: "Conciliação",
      cliente: "Nutrimed Ltda",
      modal: "Virtual",
    },
  ],
  "04/09": [
    {
      hora: "09:00",
      dur: 120,
      tipo: "Audiência una",
      cliente: "Têxtil Aurora",
      modal: "Presencial",
    },
  ],
};

const H0 = 8;
const H1 = 19;
const PX = 56;

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

// ── sub-hook: navegação do Dia (clamp na semana de referência) ────────────────
function useDiaNav() {
  const [calDia, setCalDia] = useState<string>("02/09");
  const nav = useCallback(
    (delta: number) =>
      setCalDia((cur) => {
        const i = Math.max(
          0,
          Math.min(DIAS_NAV.length - 1, DIAS_NAV.indexOf(cur as never) + delta),
        );
        return DIAS_NAV[i];
      }),
    [],
  );
  return {
    calDia,
    prev: useCallback(() => nav(-1), [nav]),
    next: useCallback(() => nav(1), [nav]),
    hoje: useCallback(() => setCalDia("02/09"), []),
  };
}

// ── sub-hook: conexão Google Agenda (mock, máquina de estado local) ───────────
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

export interface CalEvento extends PrazoDec {
  onOpen: () => void;
  chipFundo: string;
}

export interface CalCelula {
  vazia: boolean;
  num?: number;
  hoje?: boolean;
  temEv?: boolean;
  temExtra?: boolean;
  extra?: string;
  evs?: CalEvento[];
}

export interface CalDiaSemana {
  dow: string;
  data: string;
  hoje: boolean;
  vazio: boolean;
  evs: (PrazoDec & { onOpen: () => void })[];
}

export interface CalHora {
  label: string;
  top: number;
}

export interface CalAudiencia {
  hora: string;
  titulo: string;
  sub: string;
  cor: string;
  fundo: string;
  top: number;
  altura: number;
  onOpen: () => void;
}

// Mês inteiro cai numa terça (01/09/2026) → grade começa no domingo com 2 vazias.
function mesGrade(todos: PrazoMock[]): { dias: CalCelula[] }[] {
  const lead = 2;
  const cells: CalCelula[] = [];
  for (let i = 0; i < lead; i++) cells.push({ vazia: true });
  for (let d = 1; d <= 30; d++) {
    const data = String(d).padStart(2, "0") + "/09";
    const evs = todos.filter(
      (p) => p.fatal === data && p.stage !== "protocolado",
    );
    cells.push({
      vazia: false,
      num: d,
      hoje: d === 2,
      temEv: evs.length > 0,
      temExtra: evs.length > 3,
      extra: (evs.length - 3).toLocaleString("pt-BR"),
      evs: evs.slice(0, 3).map((p) => {
        const x = dec(p);
        return {
          ...x,
          onOpen: () => toast(`${x.providencia} · ${x.cliente}`),
          chipFundo: `color-mix(in oklch, ${x.urgCor} 14%, transparent)`,
        };
      }),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ vazia: true });
  const weeks: { dias: CalCelula[] }[] = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push({ dias: cells.slice(i, i + 7) });
  return weeks;
}

function agenda(todos: PrazoMock[]): CalDiaSemana[] {
  const dias: [string, string][] = [
    ["segunda", "01/09"],
    ["terça", "02/09"],
    ["quarta", "03/09"],
    ["quinta", "04/09"],
    ["sexta", "05/09"],
  ];
  return dias.map(([dow, data]) => {
    const evs = todos
      .filter((p) => p.fatal === data && p.stage !== "protocolado")
      .slice(0, 6)
      .map((p) => {
        const d = dec(p);
        return { ...d, onOpen: () => toast(`${d.providencia} · ${d.cliente}`) };
      });
    return { dow, data, hoje: data === "02/09", evs, vazio: evs.length === 0 };
  });
}

function diaView(todos: PrazoMock[], calDia: string) {
  const data = calDia || "02/09";
  const allday = todos
    .filter((p) => p.fatal === data && p.stage !== "protocolado")
    .slice(0, 8)
    .map((p) => {
      const d = dec(p);
      return { ...d, onOpen: () => toast(`${d.providencia} · ${d.cliente}`) };
    });

  const horas: CalHora[] = [];
  for (let h = H0; h <= H1; h++)
    horas.push({
      label: (h < 10 ? "0" + h : String(h)) + ":00",
      top: (h - H0) * PX,
    });

  const eventos: CalAudiencia[] = (AUD_DEFS[data] || []).map((a) => {
    const [hh, mm] = a.hora.split(":").map(Number);
    const cor = a.modal === "Virtual" ? "var(--primary)" : "var(--gold)";
    return {
      hora: a.hora,
      titulo: a.tipo,
      sub: `${a.cliente} · ${a.modal}`,
      cor,
      fundo: `color-mix(in oklch, ${cor} 12%, transparent)`,
      top: (hh - H0 + mm / 60) * PX,
      altura: Math.max(38, (a.dur / 60) * PX - 4),
      onOpen: () => toast(`Detalhe da audiência · ${a.cliente}`),
    };
  });

  return {
    data,
    dow: DOW_MAP[data] || "dia",
    allday,
    temAllday: allday.length > 0,
    horas,
    eventos,
    alturaTotal: (H1 - H0 + 1) * PX,
  };
}

// Hook público do Calendário — compõe os sub-hooks e devolve tudo bindável.
export function usePrazosCalendario() {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });
  const modo = useModo();
  const diaNav = useDiaNav();
  const google = useGoogle();

  const todos = useMemo(() => query.data ?? [], [query.data]);

  const mes = useMemo(() => mesGrade(todos), [todos]);
  const semana = useMemo(() => agenda(todos), [todos]);
  const dia = useMemo(
    () => diaView(todos, diaNav.calDia),
    [todos, diaNav.calDia],
  );

  return {
    isLoading: query.isLoading,
    titulo: "Setembro 2026",
    diasSemana: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
    modo: modo.modo,
    ehMes: modo.ehMes,
    ehSemana: modo.ehSemana,
    ehDia: modo.ehDia,
    setMes: modo.setMes,
    setSemana: modo.setSemana,
    setDia: modo.setDia,
    mes,
    semana,
    dia: { ...dia, prev: diaNav.prev, next: diaNav.next, hoje: diaNav.hoje },
    google,
  };
}
