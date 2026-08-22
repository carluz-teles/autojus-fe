"use client";

// TeorPublicacao — movido de intimacao-detail.tsx (Regra nº1) para shared/
// para ser reutilizado também pelo PainelDetalhe do master-detail compacto.
// Dois modos (prop `variant`):
//  • "section"   — título + teor sempre visível, colapsado por ALTURA com fade
//                  (mask-image) + "Ver mais". Usado na tela full /intimacoes/[id].
//  • "disclosure" — teor ESCONDIDO atrás de um botão "Ver teor da publicação ▸"
//                  que expande sob demanda. Usado no painel compacto (não despeja
//                  o parágrafo inteiro na ficha).
// `borderColor` distingue o contexto da borda-esquerda: "gold" no painel, "border" na full.

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
   * Altura máxima (px) do estado colapsado — só no variant "section".
   * Default: 260.
   */
  collapsedHeight?: number;
  /**
   * "section" (padrão) = teor sempre visível, colapso por altura + fade (tela full).
   * "disclosure" = escondido atrás de "Ver teor da publicação ▸", expande sob demanda
   * (painel compacto do master-detail).
   */
  variant?: "section" | "disclosure";
}

export function TeorPublicacao({
  content,
  borderColor = "border",
  collapsedHeight = 260,
  variant = "section",
}: TeorPublicacaoProps) {
  if (variant === "disclosure") {
    return <TeorDisclosure content={content} borderColor={borderColor} />;
  }
  return (
    <TeorSection
      content={content}
      borderColor={borderColor}
      collapsedHeight={collapsedHeight}
    />
  );
}

/** Classes da borda-esquerda + tipografia do corpo do teor — compartilhadas pelos 2 modos. */
function corpoClasses(borderColor: "gold" | "border"): string {
  return cn(
    "prose-intimacao text-foreground/90 border-l-2 pl-4 text-[14px] leading-relaxed",
    borderColor === "gold" ? "border-[var(--gold)]" : "border-border",
  );
}

/**
 * Modo disclosure: só um botão "Ver teor da publicação ▸". Ao expandir, mostra o teor
 * COMPLETO (o painel lateral já tem overflow-y-auto, então rola dentro dele). Sem fade —
 * expandir é justamente o gesto de "quero ler tudo".
 */
function TeorDisclosure({
  content,
  borderColor,
}: {
  content: string;
  borderColor: "gold" | "border";
}) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();

  return (
    <section className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground gap-1.5 pl-0"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform", aberto && "rotate-90")}
          strokeWidth={1.8}
        />
        {aberto ? "Ocultar teor da publicação" : "Ver teor da publicação"}
      </Button>
      {aberto ? (
        <div
          id={painelId}
          className={cn(corpoClasses(borderColor), "mt-3")}
          // sanitizeContentHtml remove scripts/handlers/URIs perigosas (DJEN externo).
          dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(content) }}
        />
      ) : null}
    </section>
  );
}

/**
 * Modo section: teor sempre visível, colapsado a `collapsedHeight` com fade (mask-image)
 * + "Ver mais". Mede a altura real do conteúdo (via ref) para só mostrar o botão quando
 * de fato excede o limite.
 */
function TeorSection({
  content,
  borderColor,
  collapsedHeight,
}: {
  content: string;
  borderColor: "gold" | "border";
  collapsedHeight: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const [transborda, setTransborda] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reavalia o transbordo a cada reflow do conteúdo — não só na troca de content/altura.
  // scrollHeight reflete a altura REAL mesmo com o maxHeight de colapso aplicado (overflow
  // hidden não muda scrollHeight), então uma mudança de largura (resize da janela na tela
  // full, ou do painel) recalcula corretamente se o botão "Ver mais" deve aparecer.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const medir = () => setTransborda(el.scrollHeight > collapsedHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
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
        className={cn(corpoClasses(borderColor), "mt-3")}
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
