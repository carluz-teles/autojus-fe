import { endOfMonth, format, isValid, parseISO, startOfMonth } from "date-fns";

export function dataDoFiltro(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value
    ? date
    : undefined;
}

// ── Entrada manual de data no padrão BR (dd/mm/aaaa) ────────────────────────
// O wire continua ISO (yyyy-MM-dd); só a EXIBIÇÃO/digitação é brasileira. Fonte
// única de máscara + parsing, reusada pelos campos De/Até do UrgenciaFilter (as
// duas telas). A validação de data real reaproveita `dataDoFiltro` (round-trip).

/** Máscara progressiva dd/mm/aaaa: mantém só dígitos (até 8) e insere as barras. */
export function mascararDataBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)]
    .filter(Boolean)
    .join("/");
}

/** "dd/mm/aaaa" → ISO "yyyy-MM-dd" quando é data real; "" enquanto incompleta/inválida. */
export function brParaISO(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return dataDoFiltro(iso) ? iso : "";
}

/** ISO "yyyy-MM-dd" → "dd/mm/aaaa"; "" quando ausente/inválida. */
export function isoParaBR(iso: string): string {
  const date = dataDoFiltro(iso);
  return date ? format(date, "dd/MM/yyyy") : "";
}

/** Primeiro e último dia (inclusivos, ISO) do mês de `ref` — atalho "Este mês"
 *  (mês-calendário real, ao contrário do bucket disjunto "Após 7 dias, neste mês"). */
export function intervaloMesAtual(ref: Date): { from: string; to: string } {
  return {
    from: format(startOfMonth(ref), "yyyy-MM-dd"),
    to: format(endOfMonth(ref), "yyyy-MM-dd"),
  };
}

export function rotuloIntervalo(from: string, to: string): string {
  const inicio = dataDoFiltro(from);
  const fim = dataDoFiltro(to);
  if (inicio && fim)
    return from === to
      ? format(inicio, "dd/MM/yyyy")
      : `${format(inicio, "dd/MM/yyyy")} – ${format(fim, "dd/MM/yyyy")}`;
  if (inicio) return `A partir de ${format(inicio, "dd/MM/yyyy")}`;
  if (fim) return `Até ${format(fim, "dd/MM/yyyy")}`;
  return "Intervalo inválido";
}

export const limparUrgencia = { urgencia: null, due_from: null, due_to: null };
export function filtroDeIntervalo(from: string, to: string) {
  return { ...limparUrgencia, due_from: from, due_to: to };
}
export function filtroDeUrgencia(value: string) {
  return { ...limparUrgencia, urgencia: value || null };
}
