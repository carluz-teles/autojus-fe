// Formatação de exibição compartilhada entre features (billing, e o que mais precisar).

/** Formata centavos (padrão Stripe) em moeda BRL — ex. `2990` → "R$ 29,90". */
export function formatCentsBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Formata data ISO em pt-BR; retorna `fallback` se `iso` for null ou inválido. */
export function formatDate(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("pt-BR");
}
