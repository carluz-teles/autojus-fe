import { cn } from "@/lib/utils";

import type { LetterheadMargins } from "../types";

// Converte as margens (mm) em posições percentuais da folha A4 (210×297 mm) para
// desenhar o retângulo da "área segura" sobre a pré-visualização.
function safeAreaStyle(m: LetterheadMargins): React.CSSProperties {
  return {
    top: `${(m.top_mm / 297) * 100}%`,
    bottom: `${(m.bottom_mm / 297) * 100}%`,
    left: `${(m.left_mm / 210) * 100}%`,
    right: `${(m.right_mm / 210) * 100}%`,
  };
}

/**
 * Pré-visualização A4 do papel timbrado com o overlay da área segura (margens).
 * Quando há `imageUrl` mostra o timbre real (centralizado, preservando o aspecto);
 * senão desenha um placeholder decorativo (`decorated`) ou apenas a folha em branco
 * (editor). Só JSX + binding — o cálculo das margens vive em `safeAreaStyle`.
 */
export function LetterheadPreview({
  margins,
  imageUrl,
  decorated = false,
  className,
}: {
  margins: LetterheadMargins;
  imageUrl?: string;
  decorated?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[210/297] overflow-hidden rounded-md border border-black/10 bg-white",
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview de URL presigned/blob dinâmica, não vale otimizar
        <img
          src={imageUrl}
          alt="Pré-visualização do papel timbrado"
          className="absolute inset-0 size-full object-contain"
        />
      ) : decorated ? (
        <div aria-hidden className="absolute inset-0 text-zinc-700">
          {/* cabeçalho fictício (logo + nome) */}
          <div className="flex items-center gap-2 px-[11%] pt-[9%]">
            <span className="from-primary to-gold size-4 shrink-0 rounded bg-gradient-to-br" />
            <span className="flex flex-col gap-1">
              <span className="h-1.5 w-20 rounded-full bg-zinc-400" />
              <span className="h-1 w-12 rounded-full bg-zinc-300" />
            </span>
          </div>
          <span className="from-gold absolute right-[10%] left-[11%] mt-[6%] block h-px bg-gradient-to-r to-transparent" />
          {/* linhas do corpo, dentro da área segura */}
          <div
            className="absolute flex flex-col gap-1.5"
            style={{ top: "48%", left: "15%", right: "11%" }}
          >
            <span className="h-1 w-full rounded-full bg-zinc-200" />
            <span className="h-1 w-[92%] rounded-full bg-zinc-200" />
            <span className="h-1 w-[84%] rounded-full bg-zinc-200" />
          </div>
          <span className="absolute inset-x-0 bottom-[6%] mx-auto block h-1 w-[45%] rounded-full bg-zinc-200" />
        </div>
      ) : null}

      <div
        aria-hidden
        className="border-primary/40 bg-primary/5 absolute border border-dashed"
        style={safeAreaStyle(margins)}
      />
    </div>
  );
}
