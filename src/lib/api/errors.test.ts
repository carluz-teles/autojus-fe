import { expect, it } from "vitest";

import { apiErrorFromResponse } from "./errors";

it("preserves server Retry-After without changing the error body contract", async () => {
  const error = await apiErrorFromResponse(
    new Response(
      JSON.stringify({
        kind: "RATE_LIMITED",
        message: "Wait",
        details: { code: "rate_limited" },
      }),
      { status: 429, headers: { "Retry-After": "60" } },
    ),
  );
  expect(error).toMatchObject({
    status: 429,
    retryAfterSeconds: 60,
    details: { code: "rate_limited" },
  });
  const invalid = await apiErrorFromResponse(
    new Response("", { status: 429, headers: { "Retry-After": "nonsense" } }),
  );
  expect(invalid.retryAfterSeconds).toBeUndefined();
});
