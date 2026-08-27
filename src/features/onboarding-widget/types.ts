// Contrato do BE consumido pelo widget "Comece por aqui" (card flutuante de
// ativação pós-onboarding). Espelha o JSON do backend Go (snake_case).

export type OnboardingStepId =
  | "sources_connected"
  | "members_invited"
  | "first_triagem"
  | "first_analise"
  | "first_peca";

/** GET /v1/onboarding/progress */
export interface OnboardingProgress {
  steps: Record<OnboardingStepId, boolean>;
  dismissed_at: string | null;
}
