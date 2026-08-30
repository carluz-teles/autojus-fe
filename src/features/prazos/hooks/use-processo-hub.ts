"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { dec, iniciais, type PrazoDec, stageLabel } from "../lib/derivar";
import type { PrazoMock, PrazoStage } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// Classe processual inferida da providência — base da fase atual e das tags.
// Port de _classeDe do mockup.
function classeDe(prov: string): string {
  if (/Apela|Agravo|Inominado|Contrarraz/.test(prov)) return "Recurso";
  if (/Cumprimento|Impugna|Execu/.test(prov)) return "Execução";
  if (/Contesta|Réplica|Tréplica/.test(prov)) return "Conhecimento";
  return "Instrução";
}

const FASES = [
  "Conhecimento",
  "Instrução",
  "Sentença",
  "Recurso",
  "Execução",
] as const;

const FASE_ATUAL: Record<string, number> = {
  Conhecimento: 0,
  Instrução: 1,
  Recurso: 3,
  Execução: 4,
};

export interface FaseStep {
  label: string;
  ativo: boolean;
  cor: string;
  pontoCor: string;
  preenche: boolean;
  temLinha: boolean;
  linhaCor: string;
}

export interface TagChip {
  label: string;
  cor: string;
  fundo: string;
}

export interface IntimacaoItem extends PrazoDec {
  stageKey: PrazoStage;
  stageLabelTxt: string;
  onOpen: () => void;
}

export interface PecaItem {
  titulo: string;
  data: string;
  status: string;
  statusCor: string;
  statusFundo: string;
}

export interface ParteItem {
  papel: string;
  nome: string;
  proc: string;
}

export interface AutoItem {
  tipo: string;
  titulo: string;
  data: string;
  fls: string;
  fonteLabel: string;
  fonteCor: string;
  onOpen: () => void;
}

export interface AndamentoItem {
  data: string;
  texto: string;
}

export interface ProcessoHub {
  cnj: string;
  cliente: string;
  responsavel: string;
  respIniciais: string;
  valor: string;
  distribuido: string;
  tags: TagChip[];
  faseStepper: FaseStep[];
  faseLabel: string;
  ativas: number;
  intimacoes: IntimacaoItem[];
  nIntim: number;
  prazos: PrazoDec[];
  nPrazos: number;
  pecas: PecaItem[];
  nPecas: number;
  partes: ParteItem[];
  andamentos: AndamentoItem[];
  autos: AutoItem[];
  nAutos: number;
  autosFls: string;
}

// Constrói o cockpit do processo a partir do caso (match por CNJ/número) e agrega
// as intimações do mesmo cliente. Port fiel de _processoDe. Cliques → toast (sem
// rota aninhada ainda). var(--accent) do mockup → var(--primary) aqui.
function montarProcesso(raw: PrazoMock, todos: PrazoMock[]): ProcessoHub {
  const faseAtual = FASE_ATUAL[classeDe(raw.providencia)] ?? 1;
  const faseStepper: FaseStep[] = FASES.map((f, i) => ({
    label: f,
    ativo: i === faseAtual,
    cor:
      i === faseAtual
        ? "var(--fg)"
        : i < faseAtual
          ? "var(--fg2)"
          : "var(--fg3)",
    pontoCor: i <= faseAtual ? "var(--primary)" : "var(--line)",
    preenche: i <= faseAtual,
    temLinha: i < FASES.length - 1,
    linhaCor: i < faseAtual ? "var(--primary)" : "var(--line)",
  }));

  // intimações reais do mesmo cliente = as "matérias" deste processo
  const doProc = todos.filter((p) => p.cliente === raw.cliente).slice(0, 6);
  const intimacoes: IntimacaoItem[] = doProc.map((p) => ({
    ...dec(p),
    stageKey: p.stage,
    stageLabelTxt: stageLabel(p.stage),
    onOpen: () => toast(`Abriria intimação: ${p.providencia}`),
  }));
  const prazos: PrazoDec[] = doProc
    .filter((p) => p.stage !== "protocolado")
    .slice(0, 4)
    .map(dec);

  const mix = (cor: string, pct: number) =>
    `color-mix(in oklch, ${cor} ${pct}%, transparent)`;

  const pecas: PecaItem[] = [
    {
      titulo: "Minuta — " + raw.providencia,
      data: "27/08/26",
      status: "Rascunho",
      statusCor: "var(--gold)",
      statusFundo: mix("var(--gold)", 14),
    },
    {
      titulo: "Petição de juntada de procuração",
      data: "15/03/24",
      status: "Protocolada",
      statusCor: "var(--green)",
      statusFundo: mix("var(--green)", 12),
    },
    {
      titulo: "Contrato social",
      data: "15/03/24",
      status: "Anexada",
      statusCor: "var(--fg3)",
      statusFundo: mix("var(--fg3)", 12),
    },
  ];

  const partes: ParteItem[] = [
    { papel: "Autor", nome: raw.cliente, proc: "Dr. " + raw.resp },
    {
      papel: "Réu",
      nome: "Banco Meridional S.A.",
      proc: "Dra. Helena Vasques (OAB/SP 214.556)",
    },
  ];

  const FONTE: Record<string, { l: string; c: string }> = {
    nosso: { l: "Nosso", c: "var(--primary)" },
    adverso: { l: "Adverso", c: "var(--red)" },
    juizo: { l: "Juízo", c: "var(--blue)" },
    perito: { l: "Perito", c: "var(--gold)" },
  };
  const doc = (
    tipo: string,
    titulo: string,
    data: string,
    fls: string,
    fonte: string,
  ): AutoItem => {
    const t = FONTE[fonte];
    return {
      tipo,
      titulo,
      data,
      fls,
      fonteLabel: t.l,
      fonteCor: t.c,
      onOpen: () => toast(`Abriria: ${titulo} (fls. ${fls})`),
    };
  };
  const autos: AutoItem[] = [
    doc("Petição", "Petição inicial", "12/03/24", "1–48", "nosso"),
    doc(
      "Documento",
      "Procuração e contrato social",
      "12/03/24",
      "49–57",
      "nosso",
    ),
    doc("Petição", "Contestação", "20/05/24", "60–112", "adverso"),
    doc("Decisão", "Despacho saneador", "12/08/26", "338–340", "juizo"),
    doc("Prova", "Laudo pericial", "20/08/26", "380–421", "perito"),
    doc("Decisão", "Sentença", "25/08/26", "512–530", "juizo"),
  ];

  const andamentos: AndamentoItem[] = [
    {
      data: raw.publicacao + "/26",
      texto: "Publicação disponibilizada no DJEN.",
    },
    { data: "12/08/26", texto: "Conclusos para despacho." },
    { data: "05/08/26", texto: "Juntada de petição da parte adversa." },
    {
      data: "12/03/24",
      texto: "Distribuído por dependência à " + raw.orgao + ".",
    },
  ];

  const tagNeutra = (label: string): TagChip => ({
    label,
    cor: "var(--fg2)",
    fundo: "var(--hover)",
  });

  return {
    cnj: raw.cnj,
    cliente: raw.cliente,
    responsavel: raw.resp,
    respIniciais: iniciais(raw.resp),
    valor: "R$ 128.400,00",
    distribuido: "12/03/2024",
    tags: [
      tagNeutra(
        classeDe(raw.providencia) === "Execução"
          ? "Execução de Título"
          : "Procedimento Comum",
      ),
      tagNeutra(raw.orgao),
      {
        label: "Polo ativo",
        cor: "var(--primary)",
        fundo: mix("var(--primary)", 9),
      },
    ],
    faseStepper,
    faseLabel: FASES[faseAtual],
    intimacoes,
    nIntim: intimacoes.length,
    ativas: intimacoes.filter((i) => i.stage !== "protocolado").length,
    prazos,
    nPrazos: prazos.length,
    pecas,
    nPecas: pecas.length,
    partes,
    andamentos,
    autos,
    nAutos: autos.length,
    autosFls: "530 fls.",
  };
}

// Hook público do cockpit — compõe a query base e deriva o processo. O componente
// só faz JSX + binding (regra do CLAUDE.md).
export function useProcessoHub(numero: string) {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });
  const todos = useMemo(() => query.data ?? [], [query.data]);

  const raw = useMemo(
    () =>
      todos.find((p) => p.cnj === numero || p.cnj.startsWith(numero)) ?? null,
    [todos, numero],
  );

  const processo = useMemo(
    () => (raw ? montarProcesso(raw, todos) : null),
    [raw, todos],
  );

  return {
    isLoading: query.isLoading,
    naoEncontrado: !query.isLoading && !raw,
    processo,
    voltarLabel: "Prazos",
    voltarHref: "/",
  };
}
