import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  ActivateIntegrationInput,
  Integration,
  ListEnvelope,
} from "../types";

const ENDPOINT = "/v1/acquisition/integrations";

// Camada de rede da feature: funções tipadas que recebem o fetcher (ligado ao
// Clerk pelo useApi). Não conhecem React nem cache — isso é responsabilidade do hook.

export async function listIntegrations(
  fetcher: ApiFetcher,
): Promise<Integration[]> {
  const res = await fetcher<ListEnvelope<Integration>>(ENDPOINT);
  return res.data;
}

export async function activateIntegrations(
  fetcher: ApiFetcher,
  input: ActivateIntegrationInput,
): Promise<Integration[]> {
  const res = await fetcher<ListEnvelope<Integration>>(ENDPOINT, {
    method: "POST",
    body: input,
  });
  return res.data;
}
