import { expect, it } from "vitest";

import { mapChatMessageFromApi } from "./api-mapper";
import type { ChatMessageAPI } from "./api-types";

const row: ChatMessageAPI = {
  id: "message",
  draft_id: "draft",
  role: "assistant",
  content: "Synthetic",
  citations: [],
  grounded: false,
  created_at: "2026-10-01T12:00:00Z",
};
it("preserves the server receipt in new and historical assistant messages", () => {
  const result = "018f0bf8-6e67-7000-8000-000000000001";
  expect(
    mapChatMessageFromApi({
      ...row,
      ai_result_id: result,
      result_origin: "ai_with_rules",
    }),
  ).toMatchObject({ aiResultId: result, resultOrigin: "ai_with_rules" });
  for (const changed of [
    {},
    { ai_result_id: "not-a-uuid", result_origin: "ai" },
    { ai_result_id: result, result_origin: "unknown" },
    { ai_result_id: result, result_origin: "ai", role: "user" as const },
  ]) {
    expect(
      mapChatMessageFromApi({ ...row, ...changed }).aiResultId,
    ).toBeUndefined();
  }
});
