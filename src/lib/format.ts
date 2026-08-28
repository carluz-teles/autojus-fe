// Formatação de exibição compartilhada entre features (billing, e o que mais precisar).

/** Formata centavos (padrão Stripe) em moeda BRL — ex. `2990` → "R$ 29,90". */
export function formatCentsBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Formata data ISO em pt-BR; retorna `fallback` se `iso` for null ou inválido.
 *
 *  Trata "date-only" (colunas DATE do Postgres) SEM converter timezone: quando o
 *  BE envia "2026-08-17T00:00:00Z" ou "2026-08-17", queremos exibir "17/08/2026"
 *  independente do fuso do navegador. Sem esse guard, `new Date("2026-08-17T00:00:00Z")`
 *  em BR (UTC-3) vira 16/08 21:00 local → `toLocaleDateString` retorna "16/08/2026"
 *  (dia -1). Timestamps com hora não-zero (ex.: "2026-08-17T14:30:00Z") continuam
 *  no caminho normal — aí faz sentido converter pro fuso local do usuário. */
const dateOnlyRe = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z?)?$/;
export function formatDate(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const m = dateOnlyRe.exec(iso);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
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

/**
 * Converte uma data ISO/RFC3339 (ex. "2026-08-20T00:00:00Z") no valor do
 * `<input type="date">` ("YYYY-MM-DD"). Retorna "" para null/vazio/formato
 * inesperado — o input de data nunca recebe valor inválido.
 */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : "";
}

/**
 * ID curto e estável para exibição — trecho fixo do início do uuid (6 chars
 * hex upper), sem depender de contador. Usado para identificar rapidamente um
 * registro numa lista sem expor o uuid inteiro. Ex.: "550e8d4a…" → "550E8D".
 */
export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase() || "—";
}

/**
 * Formata bytes em representação legível (KB/MB) — ex. `245760` → "240 KB".
 * Retorna "—" para null/undefined.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
