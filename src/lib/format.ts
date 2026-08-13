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

const countFormatter = new Intl.NumberFormat("pt-BR");

/** Formata uma contagem inteira no padrão pt-BR — ex. `1247` → "1.247". */
export function formatCount(n: number): string {
  return countFormatter.format(n);
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata o valor da causa (decimal em string, ex. "250000.00") em BRL pt-BR —
 * ex. "R$ 250.000,00". Retorna `fallback` quando null/vazio ou não-numérico.
 */
export function formatClaimValueBRL(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? brlFormatter.format(n) : fallback;
}

/** Formata data+hora ISO em pt-BR; retorna `fallback` se null ou inválido. */
export function formatDateTime(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
