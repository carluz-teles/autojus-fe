"use client";

// useDraftStream — assina o SSE /v1/pecas/:id/generation-stream, extrai o
// campo `draft_markdown` do JSON incremental do LLM e dispara onProgress
// com o markdown FULL acumulado (throttled por rAF). Usado pelo EditorArea
// pra "digitar" a peça no Tiptap em tempo real.
//
// Por que markdown e não HTML: tokens do LLM cortam tags no meio (`<h2>` chega
// como `<`, `h`, `2>`) e o ProseMirror escapa fragmentos incompletos, corrompendo
// o output. Markdown é o padrão da indústria pra LLM streaming (ChatGPT Canvas,
// Claude Artifacts, Cursor) — não tem tags pareadas pra corromper, funciona
// char-a-char. BE emite markdown, FE converte pra HTML e aplica com setHtml.
//
// Ativa apenas quando `enabled` é true (tipicamente sagaState === EXTRACTING).
// Emite onDone quando o BE fecha o stream (saga DRAFTED/FAILED). Reconexão
// gerenciada pelo próprio EventSource; se cair de vez, componente pai faz
// refetch do draft e usa content_html final persistido.

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { createStreamingJsonFieldParser } from "../lib/stream-parser";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface Options {
  enabled: boolean;
  /** Recebe o markdown FULL acumulado (não delta) — throttled por rAF, uma
   *  flush por frame. O consumer converte markdown → HTML (via marked) e
   *  aplica com setHtml(). */
  onProgress: (fullMarkdown: string) => void;
  onDone?: (saga: "DRAFTED" | "FAILED" | string) => void;
  onError?: (err: unknown) => void;
}

export function useDraftStream(draftId: string, opts: Options): void {
  const { getToken } = useAuth();
  const parserRef = useRef(createStreamingJsonFieldParser("draft_markdown"));
  const onProgressRef = useRef(opts.onProgress);
  const onDoneRef = useRef(opts.onDone);
  const onErrorRef = useRef(opts.onError);
  useEffect(() => {
    onProgressRef.current = opts.onProgress;
    onDoneRef.current = opts.onDone;
    onErrorRef.current = opts.onError;
  }, [opts.onProgress, opts.onDone, opts.onError]);

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
      const { token: streamToken } = (await tokenRes.json()) as {
        token: string;
      };
      if (cancelled || !streamToken) return;

      // Reseta parser por conexão (nova geração pode reiniciar do zero)
      parserRef.current = createStreamingJsonFieldParser("draft_markdown");

      const url = `${API}/v1/pecas/${draftId}/generation-stream?stream_token=${encodeURIComponent(streamToken)}`;
      es = new EventSource(url, { withCredentials: false });

      // Throttle via rAF: chunks chegam mais rápido que o browser consegue
      // re-renderizar o Tiptap. Uma única flush por frame é fluida e barata.
      let pending = false;
      es.addEventListener("chunk", (e: MessageEvent) => {
        parserRef.current.push(e.data);
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          onProgressRef.current(parserRef.current.full());
        });
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
