import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import type { Subscription } from "../types";

const BASE = "/v1/billing";

// Camada de rede da feature: funções tipadas que recebem o fetcher (ligado ao
// Clerk pelo useApi). Não conhecem React nem cache — isso é responsabilidade do hook.

/**
 * 404 ENTITY_NOT_FOUND ("tenant nunca fez checkout") é o estado "sem assinatura
 * ainda" — válido, não um erro de tela. Traduzido pra `null` aqui, na fronteira
 * com a API, pra quem consome o service nunca precisar checar `kind` na mão.
 */
export async function getSubscription(
  fetcher: ApiFetcher,
): Promise<Subscription | null> {
  try {
    return await fetcher<Subscription>(`${BASE}/subscription`);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "ENTITY_NOT_FOUND") return null;
    throw err;
  }
}
