"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { PROVIDENCIA_RECOMENDADA, PROVIDENCIAS, TESES } from "../mock-data";

// Etapas da jornada na tela de intimação: decidir → gerar (a saga roda no BE;
// aqui é simulada por timers) → minuta pronta na peça vinculada → resolver.
// A construção da peça em si (edição, resumo, anexos, protocolação) acontece
// na tela de peça existente — a intimação acompanha o estado e fecha o ciclo.
export type EtapaJornada = "decisao" | "gerando" | "pronta" | "concluida";

export type Desfecho = "protocolo" | "registro" | "ignorada";

const INDICE_JORNADA: Record<EtapaJornada, number> = {
  decisao: 0,
  gerando: 1,
  pronta: 2,
  concluida: 3,
};

const PASSOS_GERACAO = [
  "Lendo o teor e os autos do processo",
  "Ancorando os fundamentos selecionados",
  "Redigindo a minuta",
] as const;

const selecionadasPadrao = () =>
  new Set(TESES.filter((t) => t.incluidaPorPadrao).map((t) => t.id));

/** Simula a saga de geração (EXTRACTING→DRAFTED) acompanhada da intimação. */
function useGeracaoSimulada(aoConcluir: () => void) {
  const [passo, setPasso] = useState(0);
  const [ancorados, setAncorados] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const iniciar = useCallback(
    (totalTeses: number) => {
      setPasso(0);
      setAncorados(0);
      const agendar = (fn: () => void, ms: number) =>
        timers.current.push(window.setTimeout(fn, ms));
      agendar(() => setPasso(1), 1100);
      for (let i = 1; i <= totalTeses; i += 1)
        agendar(() => setAncorados(i), 1300 + i * 450);
      agendar(() => setPasso(2), 1700 + totalTeses * 450);
      agendar(aoConcluir, 3200 + totalTeses * 450);
    },
    [aoConcluir],
  );

  return { passos: PASSOS_GERACAO, passo, ancorados, iniciar };
}

/** Seleção de fundamentos, viva desde a decisão (elimina a tela de "Partida"). */
function useSelecaoTeses() {
  const [incluidas, setIncluidas] = useState<Set<string>>(selecionadasPadrao);

  const alternar = useCallback((id: string) => {
    setIncluidas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(id)) proxima.delete(id);
      else proxima.add(id);
      return proxima;
    });
  }, []);

  const redefinir = useCallback(() => setIncluidas(selecionadasPadrao()), []);

  return { incluidas, alternar, redefinir };
}

export function useIntimacaoWorkspaceMock() {
  const [etapa, setEtapa] = useState<EtapaJornada>("decisao");
  const [desfecho, setDesfecho] = useState<Desfecho | null>(null);
  const [providenciaId, setProvidenciaId] = useState(
    PROVIDENCIA_RECOMENDADA.id,
  );
  // No app real, "Abrir construção da peça" navega para /pecas/:id (a tela
  // atual). No mockup só registramos a intenção e mostramos a nota.
  const [abriuPeca, setAbriuPeca] = useState(false);

  const aoConcluirGeracao = useCallback(() => setEtapa("pronta"), []);
  const geracao = useGeracaoSimulada(aoConcluirGeracao);
  const selecao = useSelecaoTeses();

  const providencia =
    PROVIDENCIAS.find((p) => p.id === providenciaId) ?? PROVIDENCIA_RECOMENDADA;

  const escolherProvidencia = useCallback(
    (id: string) => setProvidenciaId(id),
    [],
  );

  const gerarMinuta = useCallback(() => {
    setEtapa("gerando");
    geracao.iniciar(selecao.incluidas.size);
  }, [geracao, selecao.incluidas.size]);

  const registrarSemMinuta = useCallback(() => {
    setDesfecho("registro");
    setEtapa("concluida");
  }, []);

  const ignorarIntimacao = useCallback(() => {
    setDesfecho("ignorada");
    setEtapa("concluida");
  }, []);

  const abrirPeca = useCallback(() => setAbriuPeca(true), []);

  const simularProtocolo = useCallback(() => {
    setDesfecho("protocolo");
    setEtapa("concluida");
  }, []);

  const proximaDaFila = useCallback(() => {
    setEtapa("decisao");
    setDesfecho(null);
    setAbriuPeca(false);
    setProvidenciaId(PROVIDENCIA_RECOMENDADA.id);
    selecao.redefinir();
  }, [selecao]);

  return {
    etapa,
    desfecho,
    indiceJornada: INDICE_JORNADA[etapa],
    providencia,
    providenciaId,
    escolherProvidencia,
    gerarMinuta,
    registrarSemMinuta,
    ignorarIntimacao,
    abrirPeca,
    abriuPeca,
    simularProtocolo,
    proximaDaFila,
    geracao,
    selecao,
  };
}
