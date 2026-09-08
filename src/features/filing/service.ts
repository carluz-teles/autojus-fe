import type { ApiFetcher } from "@/lib/api/use-api";

import type { FilingAttempt } from "./types";

export async function getFilingAttempt(
  fetcher: ApiFetcher,
  draftId: string,
  signal?: AbortSignal,
): Promise<FilingAttempt | null> {
  const result = await fetcher<{ data: FilingAttempt | null }>(
    `/v1/pecas/${draftId}/filing`,
    { signal },
  );
  return result.data;
}
