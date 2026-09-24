"use client";

// S2 (docs/qa-remediation-evidence/fe-operations-architecture.md) — o que o
// `refetchInterval` BOUNDED de usePipelineCounts/useIntimacoes (mesmo intervalo
// enquanto uma captura real está "Em andamento") NÃO garante sozinho:
//
//   1. COERÊNCIA NO TERMINAL: o intervalo é periódico (ex.: a cada 4s); o
//      capture_run pode virar terminal ENTRE dois ticks — a última leitura
//      "em andamento" pode não refletir o resultado final (o servidor grava
//      as últimas linhas/contagens perto do fim). Mesmo intervalo não fecha
//      esse gap: só uma busca DISPARADA pela própria transição (não por
//      tempo) garante isso. Por isso este hook observa `active` E, na
//      transição true→false, pede UM refetch extra (não é outro polling).
//   2. GUARDA DE STALL: se `active` ficar `true` por tempo demais (um
//      capture_run travado em RUNNING), o polling NÃO deve continuar pra
//      sempre — é um teto de duração (não de tentativas, como o poll-window
//      do detalhe em use-intimacoes.ts, porque uma captura real pode
//      legitimamente levar minutos, diferente do poll por item). Passado o
//      teto, o polling desliga mesmo que `active` continue `true` — nunca um
//      polling permanente.
//
// Nenhum subsistema novo: só `useState`/`useRef`/`useEffect` (primitivas do
// próprio React) sobre o sinal JÁ real de `capturaEmAndamento`/`useCaptures`.
// O teto NÃO lê `Date.now()` durante o render (regra de pureza) — é um
// `setTimeout` agendado dentro do efeito, que só chama `setStalled` no seu
// PRÓPRIO callback (nunca sincronamente no corpo do efeito).

import { useEffect, useRef, useState } from "react";

export interface UseCapturaBoundedRefetchResult {
  /** Valor pronto pra passar como `refetchIntervalMs` — `false` quando
   *  inativo OU quando o teto de duração (stall guard) foi atingido. */
  pollIntervalMs: number | false;
  /** true só quando o teto de duração foi atingido com a captura ainda
   *  "ativa" (útil pra diagnóstico/telemetria; não é usado pra esconder UI). */
  stalled: boolean;
}

/**
 * `active` = sinal REAL (ex.: `capturaEmAndamento(useCaptures().data?.runs)`).
 * `onTerminal` é chamado EXATAMENTE UMA VEZ por transição true→false (nunca no
 * primeiro render mesmo que `active` comece `false`, nunca duas vezes pra uma
 * mesma transição, mesmo com re-renders intermediários).
 */
export function useCapturaBoundedRefetch(
  active: boolean,
  intervalMs: number,
  maxDurationMs: number,
  onTerminal: () => void,
): UseCapturaBoundedRefetchResult {
  const [stalled, setStalled] = useState(false);
  const wasActiveRef = useRef(false);
  const onTerminalRef = useRef(onTerminal);

  // Callback sempre fresco, sem exigir que o caller o memoize.
  useEffect(() => {
    onTerminalRef.current = onTerminal;
  });

  // Detecta a transição running→terminal (nunca no 1º render) — chamada
  // acontece no CALLBACK do efeito (evento de mudança de `active`), não uma
  // sincronização incondicional a cada render.
  useEffect(() => {
    if (!active && wasActiveRef.current) {
      onTerminalRef.current();
    }
    wasActiveRef.current = active;
  }, [active]);

  // Teto de duração: agenda UM timer só quando `active` liga; o próprio
  // timer (não o corpo do efeito) marca `stalled`. `active` desligar antes do
  // teto limpa o timer (cleanup) sem nunca ter marcado stalled.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setStalled(true), maxDurationMs);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [active, maxDurationMs]);

  return { pollIntervalMs: active && !stalled ? intervalMs : false, stalled };
}
