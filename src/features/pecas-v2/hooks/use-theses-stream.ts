"use client";

// useThesesStream — assina o SSE /v1/intimacoes/:id/theses-stream e emite os
// fundamentos UM A UM conforme o BE os gera, em vez de esperar ~9s pelo POST
// síncrono que devolve todos de uma vez.
//
// Diferente de useDraftStream (que acumula MARKDOWN cru delta-a-delta), aqui
// cada frame `thesis` é um objeto COMPLETO (o mesmo wire shape do
// GET /theses + um ordinal `n`) — não há buffer/Last-Event-ID a manter. Só
// mapeamos e acrescentamos.
//
// Fluxo em 2 passos (spec HTML5 EventSource não aceita headers custom):
//   1) POST /theses-stream-token com Bearer JWT → token opaco (curta duração)
//   2) EventSource com ?stream_token=xxx
//
// Eventos:
//   progress {count}          → atualiza o header "N encontrados"
//   thesis   {…, n}           → mapeia e acrescenta um card (id local `stream-${n}`)
//   review   {kept, order}    → poda cards fora de `kept` e reordena por `order`
//   done     {data:[…]}       → substitui pela lista autoritativa (ids reais) + fecha
//   error    {message}        → status "error", MANTÉM os cards já mostrados
//
// DEGRADAÇÃO: se o stream falhar ANTES da 1ª tese (token/SSE bloqueado), o
// consumer cai no POST síncrono existente. Se falhar DEPOIS (≥1 card), mantém
// os cards + erro inline. O flag `hadThesis` distingue os dois no callback.

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { mapThesisFromApi } from "../lib/api-mapper";
import type { ThesisAPI } from "../lib/api-types";
import type { Thesis } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type ThesesStreamStatus = "idle" | "streaming" | "done" | "error";

export interface ThesesStreamState {
  /** Teses acumuladas incrementalmente (ids locais `stream-${n}` até o `done`). */
  theses: Thesis[];
  /** Contador do header "N encontrados" (do evento `progress`). */
  count: number;
  status: ThesesStreamStatus;
  /** Mensagem de erro (evento `error`), quando houver. */
  error?: string;
}

export interface UseThesesStreamOptions {
  enabled: boolean;
  /** Recebe a lista autoritativa (ids reais) no `done` — o consumer semeia o cache. */
  onDone?: (theses: Thesis[]) => void;
  /** Erro do stream. `hadThesis=false` → falha PRÉ-1ª-tese → cair no POST síncrono. */
  onError?: (hadThesis: boolean, message?: string) => void;
}

interface ThesisFrameAPI extends ThesisAPI {
  n: number;
}

/** streamId local pra uma tese antes do `done` — estável por ordinal. */
export function streamId(n: number): string {
  return `stream-${n}`;
}

/** Ordinal embutido no id local (`stream-3` → 3). */
function ordinalOf(id: string): number {
  return Number(id.replace("stream-", ""));
}

// ── Reduções puras dos eventos (testáveis sem DOM; o hook as reusa) ──────────

/** `thesis` — mapeia o frame e acrescenta o card. Idempotente: substitui se o
 *  ordinal repetir (entrega at-least-once do SSE). */
export function applyThesisFrame(
  theses: Thesis[],
  frame: ThesisFrameAPI,
): Thesis[] {
  const thesis: Thesis = {
    ...mapThesisFromApi(frame),
    id: streamId(frame.n),
    position: frame.n,
  };
  return [...theses.filter((t) => t.id !== thesis.id), thesis];
}

/** `review` — poda os cards fora de `kept` e reordena por `order`. */
export function applyReview(
  theses: Thesis[],
  kept: number[],
  order: number[],
): Thesis[] {
  const keep = new Set(kept);
  const survivors = theses.filter((t) => keep.has(ordinalOf(t.id)));
  const byOrdinal = new Map(survivors.map((t) => [ordinalOf(t.id), t]));
  const reordered = order
    .map((n) => byOrdinal.get(n))
    .filter((t): t is Thesis => !!t);
  // Sobrevivente não citado em `order` vai pro fim (defensivo).
  const trailing = survivors.filter((t) => !order.includes(ordinalOf(t.id)));
  return [...reordered, ...trailing];
}

export function useThesesStream(
  intimacaoId: string,
  opts: UseThesesStreamOptions,
): ThesesStreamState {
  const { getToken } = useAuth();
  const [state, setState] = useState<ThesesStreamState>({
    theses: [],
    count: 0,
    status: "idle",
  });

  const onDoneRef = useRef(opts.onDone);
  const onErrorRef = useRef(opts.onError);
  useEffect(() => {
    onDoneRef.current = opts.onDone;
    onErrorRef.current = opts.onError;
  }, [opts.onDone, opts.onError]);

  useEffect(() => {
    if (!opts.enabled) return;

    let cancelled = false;
    let es: EventSource | null = null;
    // Rastreia se já vimos ≥1 tese — decide a degradação no erro.
    let hadThesis = false;

    (async () => {
      // Reseta o state por conexão (novo `enabled` recomeça do zero). Fica no
      // corpo do async (não do efeito) pra não disparar cascata de re-render.
      setState({ theses: [], count: 0, status: "streaming" });
      const jwt = await getToken();
      if (cancelled) return;
      if (!jwt)
        throw new Error("Sessão indisponível para acompanhar os fundamentos.");

      const tokenRes = await fetch(
        `${API}/v1/intimacoes/${intimacaoId}/theses-stream-token`,
        { method: "POST", headers: { Authorization: `Bearer ${jwt}` } },
      );
      if (cancelled) return;
      if (!tokenRes.ok)
        throw new Error("Não foi possível abrir o acompanhamento.");
      const { token: streamToken } = (await tokenRes.json()) as {
        token: string;
      };
      if (cancelled) return;
      if (!streamToken)
        throw new Error("Token de acompanhamento indisponível.");

      const url = `${API}/v1/intimacoes/${intimacaoId}/theses-stream?stream_token=${encodeURIComponent(streamToken)}`;
      es = new EventSource(url, { withCredentials: false });

      es.addEventListener("progress", (e: MessageEvent) => {
        if (cancelled) return;
        const { count } = JSON.parse(e.data as string) as { count: number };
        setState((s) => ({ ...s, count }));
      });

      es.addEventListener("thesis", (e: MessageEvent) => {
        if (cancelled) return;
        const frame = JSON.parse(e.data as string) as ThesisFrameAPI;
        hadThesis = true;
        setState((s) => ({ ...s, theses: applyThesisFrame(s.theses, frame) }));
      });

      es.addEventListener("review", (e: MessageEvent) => {
        if (cancelled) return;
        const { kept, order } = JSON.parse(e.data as string) as {
          kept: number[];
          order: number[];
        };
        setState((s) => ({
          ...s,
          theses: applyReview(s.theses, kept, order),
        }));
      });

      es.addEventListener("done", (e: MessageEvent) => {
        if (cancelled) return;
        const { data } = JSON.parse(e.data as string) as { data: ThesisAPI[] };
        const authoritative = (data ?? []).map(mapThesisFromApi);
        setState((s) => ({ ...s, theses: authoritative, status: "done" }));
        onDoneRef.current?.(authoritative);
        es?.close();
      });

      es.addEventListener("error", (e: MessageEvent) => {
        if (cancelled) return;
        // Evento `error` de aplicação (com data JSON) — distinto do onerror de
        // transporte. Mantém os cards já mostrados.
        let message: string | undefined;
        try {
          message = (JSON.parse(e.data as string) as { message?: string })
            .message;
        } catch {
          message = undefined;
        }
        setState((s) => ({ ...s, status: "error", error: message }));
        onErrorRef.current?.(hadThesis, message);
        es?.close();
      });

      es.onerror = () => {
        // Falha de transporte. Se ainda não chegou nenhuma tese, sinaliza a
        // degradação pro POST síncrono; senão o EventSource tenta reconectar.
        if (cancelled || hadThesis) return;
        setState((s) => ({ ...s, status: "error" }));
        onErrorRef.current?.(false);
        es?.close();
      };
    })().catch((error: unknown) => {
      if (cancelled) return;
      // Falha no token/fetch → pré-1ª-tese → degradar.
      setState((s) => ({
        ...s,
        status: "error",
        error: error instanceof Error ? error.message : undefined,
      }));
      onErrorRef.current?.(
        false,
        error instanceof Error ? error.message : undefined,
      );
    });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [intimacaoId, opts.enabled, getToken]);

  return state;
}
