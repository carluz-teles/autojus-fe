import { format, isValid, parseISO } from "date-fns";

export function dataDoFiltro(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value
    ? date
    : undefined;
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
