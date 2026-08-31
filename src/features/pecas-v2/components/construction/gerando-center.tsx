"use client";

// Estágio GERANDO da Construção — a IA "redige" a peça em tempo real.
//
// Enquanto o SSE (/generation-stream) não emitiu o 1º chunk, mostra as linhas
// esqueleto pulsando (o design). Assim que o markdown começa a chegar, troca
// pelo texto renderizado (markdown→HTML via marked), progressivo e bonito pro
// cliente. O stream fica ativo enquanto `enabled` (saga EXTRACTING); o markdown
// acumulado é convertido a cada frame e injetado como HTML já formatado.
//
// Componente = JSX + binding: o streaming é orquestrado por useDraftStream (o
// único I/O), a conversão markdown→HTML é a única transformação de apresentação.

import { Loader2, Sparkles } from "lucide-react";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";

import { useDraftStream } from "../../hooks/use-draft-stream";

// GFM ligado (tables), breaks OFF — o LLM já separa parágrafos com linha em
// branco (CommonMark). Parse síncrono: roda a cada frame durante o stream.
marked.setOptions({ gfm: true, breaks: false });

const SKELETON_WIDTHS = [92, 78, 96, 64, 88, 72];

interface Props {
  draftId: string;
  /** N de teses selecionadas — pro rótulo "…e de N teses". */
  tesesLabel: string;
  /** Ativa o SSE (tipicamente saga EXTRACTING). */
  streamEnabled: boolean;
}

export function GerandoCenter({ draftId, tesesLabel, streamEnabled }: Props) {
  const [html, setHtml] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useDraftStream(draftId, {
    enabled: streamEnabled,
    onProgress: (fullMarkdown) => {
      const parsed = marked.parse(fullMarkdown, { async: false }) as string;
      setHtml(parsed);
    },
  });

  // Rola pro fim enquanto a IA "desce" o texto.
  useEffect(() => {
    if (html && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [html]);

  const hasText = html.trim().length > 0;

  return (
    <div className="mx-auto my-10 max-w-[720px]">
      <div className="border-line bg-panel min-h-[400px] rounded-md border px-12 py-12 shadow-[0_8px_30px_oklch(0.27_0.012_200/8%)] md:px-16 md:py-14">
        <div className="text-primary mb-6 flex items-center gap-2.5 text-[12.5px]">
          <Loader2 className="size-[15px] animate-spin" />
          Redigindo a partir da intimação e de {tesesLabel}…
        </div>

        {hasText ? (
          <div
            ref={scrollRef}
            className="font-display max-h-[62vh] overflow-y-auto text-[14.5px] leading-[1.9] [&_h1]:mb-3 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3.5 [&_ol]:pl-6 [&_p]:mb-3.5 [&_p]:text-justify [&_ul]:mb-3.5 [&_ul]:pl-6"

            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div aria-hidden className="flex flex-col gap-3.5">
            {SKELETON_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="bg-hover h-3 animate-pulse rounded"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-fg3 mt-3 flex items-center justify-center gap-2 text-[12px]">
        <Sparkles className="text-primary size-3.5" />A IA redige a partir da
        intimação e das teses — você revisa e assina.
      </div>
    </div>
  );
}
