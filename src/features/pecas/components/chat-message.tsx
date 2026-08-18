import { Sparkles, TriangleAlert } from "lucide-react";

import type { PecaChatMessage } from "../types";
import { CitationLink } from "./citation-link";

export interface ChatMessageProps {
  message: PecaChatMessage;
}

/**
 * Bolha de chat para uma mensagem do assistente IA ou do usuário.
 * - user: alinhada à direita, fundo primary.
 * - assistant: alinhada à esquerda, avatar dourado + citações + aviso âmbar se
 *   grounded=false.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div role="listitem" className="flex justify-end">
        <div
          className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed"
          role="article"
          aria-label="Sua mensagem"
        >
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div role="listitem" className="flex items-start gap-2.5">
      {/* Avatar dourado */}
      <span
        className="bg-gold/15 text-gold mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
        aria-hidden
      >
        <Sparkles className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        {/* Aviso âmbar: resposta sem grounding */}
        {!message.grounded && (
          <div
            role="note"
            className="mb-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs"
          >
            <TriangleAlert
              className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            <span className="text-amber-700 dark:text-amber-300">
              Esta resposta não está ancorada nos documentos do processo — os
              autos ainda não foram indexados.
            </span>
          </div>
        )}

        {/* Conteúdo */}
        <div
          className="bg-muted/50 min-w-0 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed"
          role="article"
          aria-label="Resposta do assistente"
        >
          {message.content}
        </div>

        {/* Citações documentais */}
        {message.citations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 px-1">
            {message.citations.map((citation, idx) => (
              <CitationLink
                key={`${citation.document_id}-${idx}`}
                citation={citation}
                className="text-muted-foreground hover:text-foreground"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
