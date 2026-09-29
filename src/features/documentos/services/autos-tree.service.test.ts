import { expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { listAutosTree } from "./documentos.service";

it("passes process scope, search, order, and page cursor to the autos API", async () => {
  const page = {
    data: [],
    page: { limit: 20, total: 0, total_count: 0, next_cursor: null },
    filters: {},
    document_total: 0,
    document_filtered_total: 0,
  };
  const fetch = vi.fn().mockResolvedValue(page);
  const result = await listAutosTree(fetch as ApiFetcher, {
    processoId: "record-1",
    search: "DOC7",
    order: "oldest",
    cursor: "page-2",
  });
  expect(fetch).toHaveBeenCalledWith("/v1/processos/record-1/autos", {
    query: { search: "DOC7", order: "oldest", limit: 20, cursor: "page-2" },
  });
  expect(result).toBe(page);
});
