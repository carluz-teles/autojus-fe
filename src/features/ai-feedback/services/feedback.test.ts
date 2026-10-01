import { expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { feedbackDetailsSchema, getFeedback, sendFeedback } from "./feedback";

const result = "018f0bf8-6e67-7000-8000-000000000001";
const request = "018f0bf8-6e67-7000-8000-000000000002";
const absent = {
  result_id: result,
  dimension: "usefulness",
  revision: 0,
  status: "absent",
  helpful: null,
  updated_at: null,
};
const vote = {
  request_id: request,
  expected_revision: 0,
  helpful: false,
  reason_code: "",
  comment: "",
  correction: "",
} as const;
const receipt = {
  ...absent,
  status: "active",
  helpful: false,
  revision: 1,
  updated_at: "2026-10-01T12:00:00Z",
  request_id: request,
  replayed: false,
};

it("reads only the own feedback, passes cancellation, and validates identity and state", async () => {
  const api = vi.fn().mockResolvedValue({ data: absent });
  const signal = new AbortController().signal;
  expect(await getFeedback(api, result, signal)).toEqual(absent);
  expect(api).toHaveBeenCalledWith(`/v1/ai-results/${result}/feedback`, {
    signal,
  });
  for (const changed of [
    { result_id: request },
    { helpful: false },
    { revision: 1 },
    { comment: "private" },
  ]) {
    api.mockResolvedValue({ data: { ...absent, ...changed } });
    await expect(getFeedback(api, result, signal)).rejects.toThrow();
  }
});

it("accepts explicit No and historical replay but checks the exact write receipt", async () => {
  const api = vi.fn().mockResolvedValue({ data: receipt });
  const command = { action: "vote", body: vote } as const;
  expect((await sendFeedback(api, result, command)).helpful).toBe(false);
  expect(api.mock.calls[0][1]).toMatchObject({ method: "PUT", body: vote });
  api.mockResolvedValue({ data: { ...receipt, replayed: true } });
  expect((await sendFeedback(api, result, command)).replayed).toBe(true);
  for (const changed of [
    { request_id: result },
    { revision: 2 },
    { helpful: true },
    { comment: "unexpected" },
    { status: "withdrawn", helpful: null },
  ]) {
    api.mockResolvedValue({ data: { ...receipt, ...changed } });
    await expect(sendFeedback(api, result, command)).rejects.toThrow();
  }
});

it("withdraws without optional private text, and never swallows authorization failures", async () => {
  const api = vi.fn().mockResolvedValue({
    data: { ...receipt, status: "withdrawn", helpful: null },
  });
  const body = { request_id: request, expected_revision: 0 };
  await sendFeedback(api, result, { action: "withdraw", body });
  expect(api.mock.calls[0][0]).toBe(
    `/v1/ai-results/${result}/feedback/withdrawals`,
  );
  expect(api.mock.calls[0][1]).toMatchObject({ method: "POST", body });
  api.mockRejectedValue(new ApiError("FORBIDDEN", "Revogado", 403));
  await expect(getFeedback(api, result)).rejects.toMatchObject({ status: 403 });
});

it("validates optional fields by UTF-8 bytes and rejects NUL and unknown reasons", () => {
  const empty = { reason_code: "", comment: "", correction: "" };
  expect(feedbackDetailsSchema.safeParse(empty).success).toBe(true);
  for (const changed of [
    { comment: "á".repeat(2049) },
    { correction: "a".repeat(8193) },
    { comment: "\u0000" },
    { reason_code: "legal_gold" },
  ]) {
    expect(
      feedbackDetailsSchema.safeParse({ ...empty, ...changed }).success,
    ).toBe(false);
  }
});
