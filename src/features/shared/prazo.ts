import { parseISO } from "@/lib/utils";

import { hojeISO } from "./db";
import type { Contagem, PrazoDerivacao, TermoInicial } from "./types";

const FERIADO_LOCAL_DIAS = 3;

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const ehFimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Termo final determinístico: a regra sugere, o advogado confirma.
 * Dias úteis pulam sábado e domingo. Feriados nacionais entram quando houver
 * serviço de calendário do tribunal — hoje só a suspensão manual soma dias.
 */
export function calcularTermoFinal(derivacao: PrazoDerivacao): string {
  const cursor = parseISO(derivacao.termoInicialData);
  let dias = derivacao.dias * (derivacao.emDobro ? 2 : 1);
  if (derivacao.suspensao) dias += FERIADO_LOCAL_DIAS;

  if (derivacao.contagem === "corridos") {
    cursor.setDate(cursor.getDate() + dias);
    return toISO(cursor);
  }

  while (dias > 0) {
    cursor.setDate(cursor.getDate() + 1);
    if (!ehFimDeSemana(cursor)) dias -= 1;
  }
  return toISO(cursor);
}

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

export type Urgencia = "atraso" | "hoje" | "48h" | "7d" | "sem";

export function urgenciaDe(dias: number | null): Urgencia {
  if (dias === null) return "sem";
  if (dias < 0) return "atraso";
  if (dias === 0) return "hoje";
  if (dias <= 2) return "48h";
  return "7d";
}

export function corDaUrgencia(u: Urgencia): string {
  return {
    atraso: "var(--destructive)",
    hoje: "var(--gold)",
    "48h": "var(--gold)",
    "7d": "var(--muted-foreground)",
    sem: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  }[u];
}

export const TERMO_INICIAL_LABEL: Record<TermoInicial, string> = {
  disponibilizacao: "Disponibilização no diário",
  publicacao: "Publicação",
  juntada: "Juntada aos autos",
};

export const CONTAGEM_LABEL: Record<Contagem, string> = {
  uteis: "dias úteis",
  corridos: "dias corridos",
};

export const TIPOS_PRAZO = [
  "Defesa em execução",
  "Contestação",
  "Impugnação ao cumprimento",
  "Embargos de declaração",
  "Manifestação",
  "Recurso inominado",
  "Cumprimento de despacho",
];
