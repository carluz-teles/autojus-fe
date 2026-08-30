"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { dec, ORDEM, stageLabel } from "../lib/derivar";
import type { PrazoStage } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

export type ProvStatus = "idle" | "gerando" | "pronta";

const JA_TRABALHADA: PrazoStage[] = [
  "confirmado",
  "elaboracao",
  "revisao",
  "protocolado",
];

// ── sub-hook: geração sob demanda das providências (idle → gerando → pronta) ──
function useGeracao(jaTrabalhada: boolean) {
  const [gerado, setGerado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const gerar = useCallback(() => {
    setGerando(true);
    timer.current = setTimeout(() => {
      setGerando(false);
      setGerado(true);
    }, 1400);
  }, []);

  const status: ProvStatus = gerando
    ? "gerando"
    : gerado || jaTrabalhada
      ? "pronta"
      : "idle";
  return { status, gerar };
}

// Hook público do detalhe da intimação — port de _intimacaoDe. Unidade de
// trabalho: como a IA leu → providências (sob demanda) → teor → trilha.
export function useIntimacaoDetalhe(id: string) {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });

  const raw = useMemo(() => {
    const all = query.data ?? [];
    return all.find((p) => p.id === id) ?? all[0] ?? null;
  }, [query.data, id]);

  const jaTrabalhada = raw ? JA_TRABALHADA.includes(raw.stage) : false;
  const ger = useGeracao(jaTrabalhada);

  const model = useMemo(() => {
    if (!raw) return null;
    const d = dec(raw);
    const atual = ORDEM.indexOf(raw.stage);
    const stepper = ORDEM.map((k, i) => ({
      key: k,
      label: stageLabel(k),
      cor: i === atual ? "var(--fg)" : i < atual ? "var(--fg2)" : "var(--fg3)",
      temLinha: i < ORDEM.length - 1,
      linhaCor: i < atual ? "var(--primary)" : "var(--line)",
      flex: i < ORDEM.length - 1 ? 1 : 0,
    }));

    const ehIa = raw.origem === "ia";
    const ehDiv = raw.origem === "divergente";
    const prazoBase = /Embargos/.test(raw.providencia)
      ? "5 dias úteis"
      : /Inominado/.test(raw.providencia)
        ? "10 dias úteis"
        : "15 dias úteis";
    const ato = ehIa ? `${raw.providencia} (inferido)` : raw.providencia;
    const derivacao = {
      ato,
      atoConf: ehIa
        ? "IA · confiança 82%"
        : ehDiv
          ? "Divergente · revisar"
          : "Declarado na intimação",
      atoCor: ehIa ? "var(--primary)" : ehDiv ? "var(--gold)" : "var(--green)",
      prazoBase,
      regra: `${prazoBase} · contagem em dias úteis (art. 219, CPC)`,
      termo: `Publicação no DJEN em ${raw.publicacao}`,
    };

    const ptag = (tipo: string, cor: string) => ({
      tipo,
      tipoCor: cor,
      tipoFundo: `color-mix(in oklch, ${cor} 12%, transparent)`,
    });
    const provs = [
      {
        txt: "Confirmar o tipo de ato e o prazo",
        fonte: ehIa
          ? `IA classificou como “${ato}”. Peça e prazo derivam disto.`
          : "Ato declarado na própria intimação.",
        ...ptag("Validação", "var(--primary)"),
      },
      {
        txt: `Redigir ${raw.providencia}`,
        fonte: `O ato exige ${raw.providencia.toLowerCase()} em ${prazoBase}.`,
        ...ptag("Peça", "var(--gold)"),
      },
      {
        txt: "Revisão do sócio",
        fonte:
          "Peça de valor relevante exige aval do sócio antes do protocolo.",
        ...ptag("Revisão", "var(--blue)"),
      },
      {
        txt: "Protocolar até o fatal",
        fonte: `Prazo fatal ${raw.fatal} — improrrogável.`,
        ...ptag("Prazo", "var(--red)"),
      },
    ];

    const timeline = [
      { data: `${raw.publicacao}/26`, texto: "Capturada do DJEN", done: true },
      {
        data: `${raw.publicacao}/26`,
        texto: "Prazo derivado pela regra",
        done: true,
      },
      {
        data: "hoje",
        texto: ehDiv
          ? "Divergência detectada — aguarda decisão"
          : ehIa
            ? "Tipo inferido por IA — aguarda confirmação"
            : "Aguardando confirmação",
        done: false,
      },
      { data: "—", texto: "Peça em elaboração", done: false },
      { data: "—", texto: "Protocolado", done: false },
    ];

    return {
      ...d,
      urgLabel: d.urgLabel,
      stepper,
      ehIa,
      ehDiv,
      derivacao,
      teor:
        raw.trecho ||
        "Publicação capturada do DJEN. Teor integral disponível nos autos do processo.",
      provs,
      nProvs: provs.length,
      timeline,
      pecaTitulo: `Minuta — ${raw.providencia}`,
      pecaStatus:
        raw.stage === "elaboracao" || raw.stage === "revisao"
          ? "Em elaboração"
          : "Ainda não gerada",
      procCliente: raw.cliente,
      procCnj: d.cnjCurto,
    };
  }, [raw]);

  return {
    isLoading: query.isLoading,
    model,
    provStatus: ger.status,
    provIdle: ger.status === "idle",
    provGerando: ger.status === "gerando",
    provPronta: ger.status === "pronta",
    gerar: ger.gerar,
    confirmar: () => toast.success("Prazo confirmado"),
    ajustar: () => toast("Ajustar prazo"),
    gerarPeca: () => toast("Abrindo editor da peça…"),
  };
}
