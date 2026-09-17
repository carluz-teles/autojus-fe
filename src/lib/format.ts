// Formatação de exibição compartilhada entre features (billing, e o que mais precisar).

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
