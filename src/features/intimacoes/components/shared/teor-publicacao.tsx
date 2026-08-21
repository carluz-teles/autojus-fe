"use client";

// TeorPublicacao — movido de intimacao-detail.tsx (Regra nº1) para shared/
// para ser reutilizado também pelo PainelDetalhe do master-detail compacto.
// A prop borderColor distingue o contexto: "gold" no painel lateral compacto
// (border-l-2 border-[var(--gold)]) vs "border" na tela full (padrão: border-border).
// O comportamento de colapso (mask-image + "Ver mais"/"Ver menos" + aria-expanded)
// é idêntico nos dois contextos — só a altura de colapso e a cor da borda diferem.

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { cn } from "@/lib/utils";

import { EyebrowTitle } from "./eyebrow-title";

export interface TeorPublicacaoProps {
  content: string;
  /**
   * Cor da borda-esquerda do bloco de teor.
   * "border" (padrão) = border-border (usado na tela full /intimacoes/[id]).
   * "gold" = border-[var(--gold)] (usado no painel lateral compacto).
   */
  borderColor?: "gold" | "border";
  /**
   * Altura máxima (px) do estado colapsado.
   * 260 na tela full; 180 no painel compacto.
   * Default: 260.
   */
  collapsedHeight?: number;
}

/**
 * Teor da publicação com colapso progressivo. Publicações longas (comuns no DJEN)
 * ficam limitadas a `collapsedHeight` com fade no rodapé + "Ver mais". Mede a altura
 * real do conteúdo (via ref) para só mostrar o botão quando de fato excede o limite.
 */
export function TeorPublicacao({
  content,
  borderColor = "border",
  collapsedHeight = 260,
}: TeorPublicacaoProps) {
  const [expandido, setExpandido] = useState(false);
  const [transborda, setTransborda] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) setTransborda(el.scrollHeight > collapsedHeight);
  }, [content, collapsedHeight]);

  return (
    <section className="mt-6">
      <EyebrowTitle>Teor da publicação</EyebrowTitle>
      <div
        ref={contentRef}
        style={
          !expandido && transborda
            ? {
                maxHeight: collapsedHeight,
                overflow: "hidden",
                // Mascara o próprio conteúdo (não uma cor sólida sobreposta): o texto
                // desvanece revelando o fundo real por trás — a página tem um gradiente
                // atmosférico no body (globals.css), então um overlay bg-background sólido
                // destoa. maskImage funciona pra qualquer fundo, sem hardcode de cor.
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 70%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 70%, transparent 100%)",
              }
            : undefined
        }
        className={cn(
          "prose-intimacao text-foreground/90 mt-3 border-l-2 pl-4 text-[14px] leading-relaxed",
          borderColor === "gold" ? "border-[var(--gold)]" : "border-border",
        )}
        // sanitizeContentHtml remove scripts/handlers/URIs perigosas (DJEN externo).
        dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(content) }}
      />
      {transborda ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2 gap-1.5 pl-4"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
        >
          {expandido ? "Ver menos" : "Ver mais"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expandido && "rotate-180",
            )}
            strokeWidth={1.8}
          />
        </Button>
      ) : null}
    </section>
  );
}
