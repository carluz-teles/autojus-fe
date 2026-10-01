import { afterEach, expect, it, vi } from "vitest";

import { apiFetchBinary } from "./client";
afterEach(() => vi.unstubAllGlobals());
it("posts one authenticated request and returns only selected headers", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": "3",
        "X-Receipt": "id",
        "X-Private": "hidden",
      },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await apiFetchBinary("/v1/example", {
    method: "POST",
    body: { request_id: "r" },
    getToken: async () => "synthetic",
    maxBytes: 8,
    expectedContentType: "application/zip",
    responseHeaders: ["X-Receipt"],
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1]).toMatchObject({
    method: "POST",
    body: '{"request_id":"r"}',
    headers: { Authorization: "Bearer synthetic" },
    redirect: "error",
    cache: "no-store",
  });
  expect(result.headers).toEqual({ "x-receipt": "id" });
  expect(result.blob.size).toBe(3);
});
it("bounds declared and streamed sizes and refuses a wrong content type", async () => {
  for (const response of [
    new Response("12345", {
      headers: { "Content-Type": "application/zip", "Content-Length": "5" },
    }),
    new Response("12345", { headers: { "Content-Type": "application/zip" } }),
    new Response("123", { headers: { "Content-Type": "text/html" } }),
  ]) {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    await expect(
      apiFetchBinary("/v1/example", {
        maxBytes: 4,
        expectedContentType: "application/zip",
      }),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
it("retains typed HTTP errors and does not retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response('{"kind":"FORBIDDEN","message":"Revoked"}', { status: 403 }),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(
    apiFetchBinary("/v1/example", {
      maxBytes: 8,
      expectedContentType: "application/zip",
    }),
  ).rejects.toMatchObject({ status: 403, message: "Revoked" });
  expect(fetch).toHaveBeenCalledTimes(1);
});
