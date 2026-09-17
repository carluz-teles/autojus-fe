import { parseISO } from "@/lib/utils";

import { hojeISO } from "./db";

export function diasRestantes(termoFinal: string, hoje?: string): number {
  // hoje resolvido a cada chamada — nunca cacheado no módulo (senão volta ao
  // bug da const congelada). `hoje` opcional só pra testes injetarem valor.
  const ref = hoje ?? hojeISO();
  return Math.round(
    (parseISO(termoFinal).getTime() - parseISO(ref).getTime()) / 86_400_000,
  );
}

export function rotuloPrazo(dias: number | null): string {
  if (dias === null) return "sem prazo";
  if (dias < 0) return `${Math.abs(dias)} dias em atraso`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `em ${dias} dias`;
}
