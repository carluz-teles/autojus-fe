import { expect, it, vi } from "vitest";

import { feedbackQueueFixture } from "../__tests__/feedback-queue-fixture";
import {
  feedbackQueueFormSchema,
  feedbackQueueView,
  freezeFeedbackQueue,
  getFeedbackQueue,
} from "./feedback-queues";

it("requires a random quota and records shortages without redistributing them", () => {
  expect(
    feedbackQueueFormSchema.safeParse({
      from: "2026-10-01",
      to: "2026-10-01",
      quotas: { random: 0, correction: 1, negative: 1, positive: 1 },
    }).success,
  ).toBe(false);
  expect(
    feedbackQueueFormSchema.safeParse({
      from: "2026-10-01",
      to: "2026-11-01",
      quotas: { random: 1, correction: 1, negative: 1, positive: 1 },
    }).success,
  ).toBe(false);
});
it("checks receipt scope, period and quotas without emitting source identities or seed", async () => {
  const api = vi.fn().mockResolvedValue({ data: feedbackQueueFixture });
  const command = {
    request_id: "018f0bf8-6e67-7000-8000-000000000099",
    scope_id: feedbackQueueFixture.scope_id,
    expected_scope_revision: 1,
    from: feedbackQueueFixture.from,
    to: feedbackQueueFixture.to,
    quotas: feedbackQueueFixture.quotas,
  };
  const queue = await freezeFeedbackQueue(api, command);
  const body = api.mock.calls[0][1].body;
  expect(body).toEqual(command);
  expect(body).not.toHaveProperty("seed");
  expect(feedbackQueueView(queue).channels.every((c) => c.missing === 24)).toBe(
    true,
  );
  api.mockResolvedValue({
    data: { ...feedbackQueueFixture, scope_revision: 2 },
  });
  await expect(freezeFeedbackQueue(api, command)).rejects.toThrow(
    "outra seleção",
  );
});
it("rejects duplicate selected results or a receipt from another queue", async () => {
  const api = vi.fn().mockResolvedValue({
    data: {
      ...feedbackQueueFixture,
      items: feedbackQueueFixture.items.map(
        () => feedbackQueueFixture.items[0],
      ),
    },
  });
  await expect(
    getFeedbackQueue(api, feedbackQueueFixture.id),
  ).rejects.toThrow();
  api.mockResolvedValue({
    data: { ...feedbackQueueFixture, id: feedbackQueueFixture.scope_id },
  });
  await expect(getFeedbackQueue(api, feedbackQueueFixture.id)).rejects.toThrow(
    "outra fila",
  );
});
