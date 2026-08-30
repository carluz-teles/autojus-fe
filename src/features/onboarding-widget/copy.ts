// Fonte ÚNICA da linguagem do widget "Comece por aqui". Nenhum componente/hook
// da feature declara string solta — mudar um texto = mudar aqui.
//
// `members_invited.description` REUSA onboardingCopy.team.description (mesma
// copy do wizard de onboarding, fonte única) em vez de duplicar a frase.

import { onboardingCopy } from "@/features/onboarding/copy";
import type { Role } from "@/features/onboarding/types";

import type { OnboardingStepId } from "./types";

export interface OnboardingStepCopy {
  id: OnboardingStepId;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

/** Ordem fixa dos passos por role — ADMIN vê os 5, LAWYER só os 3 operacionais. */
export const ONBOARDING_STEP_ORDER: Record<Role, OnboardingStepId[]> = {
  ADMIN: [
    "sources_connected",
    "members_invited",
    "first_triagem",
    "first_analise",
    "first_peca",
  ],
  LAWYER: ["first_triagem", "first_analise", "first_peca"],
};

export const ONBOARDING_STEPS_COPY: Record<
  OnboardingStepId,
  OnboardingStepCopy
> = {
  sources_connected: {
    id: "sources_connected",
    title: "Conecte suas OABs e fontes",
    description:
      "Suas publicações passam a chegar sozinhas do DJEN e do DATAJUD.",
    ctaLabel: "Configurar termos",
    href: "/prazos/config",
  },
  members_invited: {
    id: "members_invited",
    title: "Convide seu time",
    description: onboardingCopy.team.description,
    ctaLabel: "Convidar membros",
    href: "/prazos/config",
  },
  first_triagem: {
    id: "first_triagem",
    title: "Faça a primeira triagem",
    description: "Organize a inbox e decida o que fazer com cada intimação.",
    ctaLabel: "Triar intimações",
    href: "/prazos",
  },
  first_analise: {
    id: "first_analise",
    title: "Analise a primeira intimação",
    description: "Entenda o cenário jurídico de cada caso antes de agir.",
    ctaLabel: "Analisar intimações",
    // Não existe filtro dedicado de "não analisada" na lista hoje (ver
    // Reuse Check) — leva pra inbox geral, não pra um destino inventado.
    href: "/prazos",
  },
  first_peca: {
    id: "first_peca",
    title: "Gere a primeira peça",
    description:
      "Transforme a intimação em petição pronta para revisar em minutos.",
    ctaLabel: "Criar peça",
    // "/prazos" tem o botão "Nova peça" (NovaPecaModal): escolhe a intimação
    // de origem (já filtrada PENDING) + tipo, e navega pra
    // /pecas/nova?intimation_id=... — é o entry point direto, não precisa
    // passar por /intimacoes primeiro.
    href: "/prazos",
  },
};

export const onboardingWidgetCopy = {
  eyebrow: "COMECE POR AQUI",
  pillLabel: "Comece por aqui",
  title: {
    ADMIN: "Coloque o escritório no ar",
    LAWYER: "Comece a trabalhar",
  } satisfies Record<Role, string>,
  dismiss: "Dispensar guia",
  collapseAria: "Recolher guia de comece por aqui",
  expandAria: "Expandir guia de comece por aqui",
  dismissAria: "Dispensar guia de comece por aqui",
} as const;

/** "1 passo restante" / "N passos restantes" — nunca "1 passos". */
export function remainingStepsLabel(n: number): string {
  return n === 1 ? "1 passo restante" : `${n} passos restantes`;
}
