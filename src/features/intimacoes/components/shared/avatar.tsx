// Avatar de iniciais coloridas — extraído de intimacao-detail.tsx (Regra nº1): a
// mesma "bolinha com iniciais" aparece no aside de Responsáveis do detalhe E na linha
// da lista / painel lateral do master-detail (condutor). MOCK: capacidade de papéis
// (cor sempre neutra — o design não define uma paleta por usuário ainda).

import { cn } from "@/lib/utils";

/** Extrai as iniciais de um nome completo (até 2 letras). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({
  initials: text,
  size = "md",
  variant = "solid",
}: {
  initials: string;
  size?: "sm" | "md";
  /** solid = fundo preenchido (padrão); outline = só borda, fundo transparente. */
  variant?: "solid" | "outline";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-[11px]",
        variant === "outline"
          ? "border-border text-muted-foreground border bg-transparent"
          : "bg-muted text-foreground/70",
      )}
    >
      {text}
    </span>
  );
}
