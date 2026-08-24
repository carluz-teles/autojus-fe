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
      // EventSource não permite headers custom (spec HTML5) — passa token
      // via query string. O BE usa o Fiber auth middleware que já aceita
      // ?token=... como fallback do Authorization header quando definido.
      // Se o BE não aceitar query token, o débito é adicionar aceitação lá.
      const token = await getToken();
      if (cancelled || !token) return;

      // Reseta parser por conexão (nova geração pode reiniciar do zero)
      parserRef.current = createHTMLStreamParser();

      const url = `${API}/v1/pecas/${draftId}/generation-stream?token=${encodeURIComponent(token)}`;
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
