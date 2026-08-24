"use client";

// useDraftStream — assina o SSE /v1/pecas/:id/generation-stream, extrai o
// campo `draft_html` do JSON incremental do LLM e dispara onDelta(text)
// pra cada trecho novo de HTML. Usado pelo EditorArea pra "digitar" a
// peça no Tiptap em tempo real (Fatia 3 do streaming).
//
// Ativa apenas quando `enabled` é true (tipicamente sagaState === EXTRACTING).
// Emite onDone quando o BE fecha o stream (saga DRAFTED/FAILED). Reconexão
// gerenciada pelo próprio EventSource; se cair de vez, componente pai faz
// refetch do draft e usa content_html final persistido.

import { useEffect, useRef } from "react";

import { useAuth } from "@clerk/nextjs";

import { createHTMLStreamParser } from "../lib/stream-parser";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface Options {
  enabled: boolean;
  onDelta: (htmlChunk: string) => void;
  onDone?: (saga: "DRAFTED" | "FAILED" | string) => void;
  onError?: (err: unknown) => void;
}

export function useDraftStream(draftId: string, opts: Options): void {
  const { getToken } = useAuth();
  const parserRef = useRef(createHTMLStreamParser());
  // Refs pros callbacks pra não re-abrir o EventSource a cada re-render.
  const onDeltaRef = useRef(opts.onDelta);
  const onDoneRef = useRef(opts.onDone);
  const onErrorRef = useRef(opts.onError);
  useEffect(() => {
    onDeltaRef.current = opts.onDelta;
    onDoneRef.current = opts.onDone;
    onErrorRef.current = opts.onError;
  }, [opts.onDelta, opts.onDone, opts.onError]);

  useEffect(() => {
    if (!opts.enabled) return;

    let cancelled = false;
    let es: EventSource | null = null;

    (async () => {
      // Fluxo em 2 passos (spec HTML5 EventSource não aceita headers custom):
      // 1) POST /stream-token com Bearer JWT → recebe token opaco (2min)
      // 2) EventSource com ?stream_token=xxx (token não é JWT — não vaza credencial)
      const jwt = await getToken();
      if (cancelled || !jwt) return;

      const tokenRes = await fetch(`${API}/v1/pecas/${draftId}/stream-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (cancelled || !tokenRes.ok) return;
      const { token: streamToken } = (await tokenRes.json()) as { token: string };
      if (cancelled || !streamToken) return;

      // Reseta parser por conexão (nova geração pode reiniciar do zero)
      parserRef.current = createHTMLStreamParser();

      const url = `${API}/v1/pecas/${draftId}/generation-stream?stream_token=${encodeURIComponent(streamToken)}`;
      es = new EventSource(url, { withCredentials: false });

      es.addEventListener("chunk", (e: MessageEvent) => {
        const delta = parserRef.current.push(e.data);
        if (delta) onDeltaRef.current(delta);
      });

      es.addEventListener("done", (e: MessageEvent) => {
        onDoneRef.current?.(e.data);
        es?.close();
      });

      es.onerror = (e) => {
        onErrorRef.current?.(e);
        // EventSource reconecta sozinho em caso de queda temporária. Só
        // fecha explicitamente no `done`.
      };
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [draftId, opts.enabled, getToken]);
}
