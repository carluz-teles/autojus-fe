import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import type { Plan, Subscription } from "../types";

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

/** Catálogo de planos — pode vir vazio (`data: []`), nunca `null`. */
export async function getPlans(fetcher: ApiFetcher): Promise<Plan[]> {
  const res = await fetcher<{ data: Plan[] }>(`${BASE}/plans`);
  return res.data;
}

/**
 * Abre uma Checkout Session pro plano escolhido e devolve a URL de redirect.
 * `409 CONFLICT` (tenant já tem assinatura ativa/trialing) propaga como
 * `ApiError` — quem chama decide a UX (Fase 5: oferecer o portal em vez de
 * repetir o erro cru).
 */
export async function startCheckout(
  fetcher: ApiFetcher,
  priceId: string,
): Promise<string> {
  const res = await fetcher<{ checkout_url: string }>(`${BASE}/checkout`, {
    method: "POST",
    body: { price_id: priceId },
  });
  return res.checkout_url;
}

/** Abre o Stripe Billing Portal e devolve a URL de redirect. */
export async function openPortal(fetcher: ApiFetcher): Promise<string> {
  const res = await fetcher<{ portal_url: string }>(`${BASE}/portal`, {
    method: "POST",
  });
  return res.portal_url;
}
