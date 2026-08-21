import type { ApiFetcher } from "@/lib/api/use-api";

import type { CapturesView } from "../types";

export function getCaptures(fetcher: ApiFetcher): Promise<CapturesView> {
  return fetcher<CapturesView>("/v1/acquisition/captures");
}
