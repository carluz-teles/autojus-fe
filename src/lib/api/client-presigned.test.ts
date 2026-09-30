// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, apiGetPresignedBlob, apiPutPresigned } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("presigned storage transport", () => {
  it("sends raw DOCX bytes with the signed MIME and no credentials", async () => {
    const network = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", network);
    const file = new File([new Uint8Array([1, 2, 3])], "office.docx");

    await apiPutPresigned("https://storage.example/upload?signature=ok", file);

    const [url, request] = network.mock.calls[0];
    expect(url).toBe("https://storage.example/upload?signature=ok");
    expect(request).toMatchObject({
      method: "PUT",
      body: file,
      credentials: "omit",
      redirect: "error",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
    expect(request.headers.Authorization).toBeUndefined();
  });

  it("downloads the PDF as a blob without credentials", async () => {
    const network = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    vi.stubGlobal("fetch", network);

    const blob = await apiGetPresignedBlob("https://storage.example/preview");

    expect(blob.type).toBe("application/pdf");
    expect(network.mock.calls[0][1]).toMatchObject({
      method: "GET",
      credentials: "omit",
      redirect: "error",
    });
  });

  it("never sends an authenticated request to another origin", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    await expect(
      apiFetch("https://untrusted.example/collect", {
        getToken: async () => "secret-jwt",
      }),
    ).rejects.toThrow("fora da origem da API");
    expect(network).not.toHaveBeenCalled();
  });
});
