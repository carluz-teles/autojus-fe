import { expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { getResumo } from "./resumo";

const body = {
  summary: "<script>texto</script>",
  current_status: "Em andamento",
  key_dates_and_deadlines: [],
  recent_movements: [],
  risks: [],
  recommended_actions: [],
  generated_at: "2026-10-01T12:00:00Z",
};
it("uses the existing GET and preserves an identified result", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const api = vi
    .fn()
    .mockResolvedValue({ ...body, ai_result_id: id, result_origin: "ai" });
  expect(await getResumo(api as ApiFetcher, "process-id")).toMatchObject({
    ai_result_id: id,
    summary: body.summary,
  });
  expect(api).toHaveBeenCalledWith(
    "/v1/processos/process-id/resume",
    expect.objectContaining({ method: "GET" }),
  );
});
it("accepts legacy/deterministic responses without inventing provenance", async () => {
  const api = vi.fn().mockResolvedValue(body);
  expect(
    (await getResumo(api as ApiFetcher, "id")).ai_result_id,
  ).toBeUndefined();
});
it("rejects a partial result identity without retrying the GET", async () => {
  const api = vi.fn().mockResolvedValue({
    ...body,
    ai_result_id: "11111111-1111-4111-8111-111111111111",
  });
  await expect(getResumo(api as ApiFetcher, "id")).rejects.toThrow();
  expect(api).toHaveBeenCalledTimes(1);
});
