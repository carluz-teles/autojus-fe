import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

// Painel "Análise da IA" (casca) — cabeçalho com estrela + título e uma lista de
// slots label/valor (Classificação, Confiança, Providência…). NÃO chama IA: a
// feature passa os valores já prontos, ou o painel mostra o estado placeholder
// ("chega na Fase 3"). Só JSX + binding.

/**
 * Container do painel de IA. Quando `placeholder` é passado, mostra o estado de
 * "ainda não disponível" (latão) e ignora o conteúdo. Caso contrário, renderiza
 * `children` (normalmente <IAField>s).
 */
export function IAPanel({
  title = "Análise da IA",
  children,
  placeholder,
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  /** Texto de fase — ex.: "Análise da IA chega na Fase 3". Ativa o estado casca. */
  placeholder?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1",
        className,
      )}
    >
      <header className="flex items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </span>
        <h3 className="font-display text-base leading-none">{title}</h3>
      </header>

      {placeholder ? (
        <div className="border-gold/30 bg-gold/[0.05] flex flex-col gap-1 rounded-lg border border-dashed px-4 py-6 text-center">
          <p className="text-foreground/80 text-sm font-medium">
            Análise indisponível
          </p>
          <p className="text-muted-foreground text-sm">{placeholder}</p>
        </div>
      ) : (
        <dl className="flex flex-col gap-3">{children}</dl>
      )}
    </section>
  );
}

/**
 * Linha label/valor do painel de IA. Passe `confidence` (0–100) para exibir a
 * barra de confiança em vez de `value`.
 */
export function IAField({
  label,
  value,
  confidence,
}: {
  label: string;
  value?: React.ReactNode;
  /** Percentual 0–100 — renderiza a barra de confiança. */
  confidence?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      {typeof confidence === "number" ? (
        <dd className="flex items-center gap-2">
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, confidence))}%`,
              }}
            />
          </div>
          <span className="text-foreground text-sm font-medium tabular-nums">
            {Math.round(confidence)}%
          </span>
        </dd>
      ) : (
        <dd className="text-foreground text-sm">{value ?? "—"}</dd>
      )}
    </div>
  );
}
