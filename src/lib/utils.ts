import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes condicionais e resolve conflitos de Tailwind (usado pelo shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Helpers do porte mockado (AtJud) — usados pelo mock-ui e pelas features
// ainda mockadas. Migram/somem conforme cada feature reconecta ao BE real.

export const iniciais = (nome: string) =>
  nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const parseISO = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};

export const formatarData = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR").format(parseISO(iso));

export const formatarDataCurta = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    parseISO(iso),
  );

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
