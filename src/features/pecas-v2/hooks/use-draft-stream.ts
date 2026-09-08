"use client";

// useDraftStream — assina o SSE /v1/pecas/:id/generation-stream e ACUMULA os
// chunks crus (markdown) do LLM, disparando onProgress com o markdown FULL a cada
// frame. Usado pra "digitar" a peça em tempo real (1ª geração e regeração).
//
// O modelo emite MARKDOWN PURO (a geração não usa mais JSON schema — isso
// truncava). Cada chunk do SSE é um delta cru; acumulamos direto (nada de extrair
// campo JSON — o parser antigo `draft_markdown` retornava vazio no markdown cru, e
// era por isso que o streaming não aparecia).
//
// Reset por geração: o BE publica StreamResetMarker (␞) como 1º chunk de cada
// (re)geração. Ao vê-lo, zeramos o buffer — descarta o replay stale da geração
// anterior (o cliente costuma conectar antes do worker resetar o stream Redis).
//
// Por que markdown e não HTML: tokens do LLM cortam tags no meio; markdown não tem
// tags pareadas pra corromper. BE emite markdown, FE converte pra HTML e aplica.
//
// Ativa apenas quando `enabled` é true (tipicamente sagaState === EXTRACTING).
// Emite onDone quando o BE fecha o stream (saga DRAFTED/FAILED). Reconexão
// gerenciada pelo próprio EventSource; se cair de vez, componente pai faz
// refetch do draft e usa content_html final persistido.

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { GenerationStreamBuffer } from "../lib/generation-stream-buffer";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface Options {
  enabled: boolean;
  startedAt: string;
  /** Recebe o markdown FULL acumulado (não delta) — throttled por rAF, uma
   *  flush por frame. O consumer converte markdown → HTML (via marked) e
   *  aplica com setHtml(). */
  onProgress: (fullMarkdown: string) => void;
  onDone?: (saga: "DRAFTED" | "FAILED" | string) => void;
  onError?: (err: unknown) => void;
}

export function useDraftStream(draftId: string, opts: Options): void {
  const { getToken } = useAuth();
  // Buffer cru de markdown acumulado (não JSON). Zerado por conexão e ao receber
  // o StreamResetMarker.
  const accRef = useRef("");
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

      // Zera o buffer por conexão (nova geração reinicia do zero).
      accRef.current = "";

      const url = `${API}/v1/pecas/${draftId}/generation-stream?stream_token=${encodeURIComponent(streamToken)}`;
      es = new EventSource(url, { withCredentials: false });

      // Throttle via setTimeout (~1 flush/frame a 60fps): chunks chegam mais
      // rápido que o browser consegue re-renderizar o Tiptap. Uma única
      // flush por "frame" é fluida e barata.
      //
      // Por que setTimeout e não requestAnimationFrame: rAF só dispara
      // quando o browser tem um ciclo de composição/pintura ativo pra essa
      // aba — em aba em background, minimizada, ou em contexto headless/
      // automatizado, o browser SUSPENDE rAF indefinidamente (confirmado ao
      // vivo: 0 disparos em 3s mesmo com document.visibilityState="visible").
      // Como gerar uma peça leva vários segundos, é comum o usuário trocar
      // de aba enquanto espera — com rAF, isso zera silenciosamente todo o
      // progresso visual (o editor só pinta no fallback final, via polling
      // de useDraft). setTimeout roda em qualquer estado de visibilidade
      // (no pior caso é limitado a 1x/seg em aba em background pelo spec,
      // nunca suspenso por completo), garantindo que o streaming progrida
      // de verdade independente de a aba estar em foco.
      // The generation event identifies the persisted start timestamp. Replay
      // from an older run is ignored, including its old reset marker.
      const buffer = new GenerationStreamBuffer(opts.startedAt);
      es.addEventListener("generation", (e: MessageEvent) =>
        buffer.identify(e.data),
      );
      let pending = false;
      es.addEventListener("chunk", (e: MessageEvent) => {
        const markdown = buffer.append(e.data as string);
        if (markdown === null) return;
        accRef.current = markdown;
        if (pending) return;
        pending = true;
        setTimeout(() => {
          pending = false;
          if (!cancelled) onProgressRef.current(accRef.current);
        }, 16);
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
  }, [draftId, opts.enabled, opts.startedAt, getToken]);
}
