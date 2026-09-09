// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  currentAIOperation,
  isAIRequest,
  recordAIExperience,
  rememberAIRequest,
} from "./ai-experience";

const path = "/v1/pecas/11111111-1111-4111-8111-111111111111/generate";
const id = "22222222-2222-4222-8222-222222222222";

describe("AI experience", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });
  it("does not instrument reads, streams or unrelated endpoints", () => {
    expect(isAIRequest(path, "POST")).toBe(true);
    expect(isAIRequest(path, "GET")).toBe(false);
    expect(isAIRequest(path.replace("generate", "stream-token"), "POST")).toBe(
      false,
    );
    expect(isAIRequest("/v1/ai/experience-events", "POST")).toBe(false);
  });
  it("emits once per phase and never sends content", () => {
    const send = vi.fn().mockResolvedValue(undefined);
    rememberAIRequest(path, id, performance.now());
    recordAIExperience(path, "first_content", send);
    recordAIExperience(path, "first_content", send);
    recordAIExperience(path, "complete", send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(Object.keys(send.mock.calls[0][0]).sort()).toEqual([
      "duration_ms",
      "operation_id",
      "phase",
    ]);
    expect(send.mock.calls[0][0].operation_id).toBe(id);
  });
  it("ignores background tabs and unavailable telemetry", async () => {
    const send = vi.fn().mockRejectedValue(new Error("offline"));
    rememberAIRequest(path, id, performance.now());
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    recordAIExperience(path, "complete", send);
    expect(send).not.toHaveBeenCalled();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    expect(() => recordAIExperience(path, "complete", send)).not.toThrow();
    await Promise.resolve();
  });
  it("does not subtract clocks across reloads", () => {
    rememberAIRequest(path, id, performance.now());
    const key = "ai-experience:v1:" + path;
    const value = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(key, JSON.stringify({ ...value, origin: -1 }));
    const send = vi.fn();
    recordAIExperience(path, "complete", send);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not attribute an old paint to a replacement operation", () => {
    const send = vi.fn().mockResolvedValue(undefined);
    rememberAIRequest(path, id, performance.now());
    const paintedOperation = currentAIOperation(path)!;
    const replacement = "33333333-3333-4333-8333-333333333333";
    rememberAIRequest(path, replacement, performance.now());
    recordAIExperience(path, "complete", send, paintedOperation);
    expect(send).not.toHaveBeenCalled();
    recordAIExperience(path, "complete", send, replacement);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].operation_id).toBe(replacement);
  });
});
