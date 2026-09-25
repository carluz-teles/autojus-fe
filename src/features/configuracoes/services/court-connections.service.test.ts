import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  deleteCourtConnection,
  submitMfaSeed,
} from "./court-connections.service";

describe("deleteCourtConnection", () => {
  it("sends an empty DELETE for only the selected connection", async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined);
    await deleteCourtConnection(fetcher as ApiFetcher, "selected-id");
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      "/v1/court-connections/selected-id",
      { method: "DELETE" },
    );
  });
});

describe("submitMfaSeed", () => {
  it("envia o QR como multipart sem definir Content-Type manualmente", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      id: "connection-1",
      status: "CONNECTED",
    });
    const qr = new File([new Uint8Array([1, 2, 3])], "totp.jpg", {
      type: "image/jpeg",
    });

    await submitMfaSeed(fetcher as ApiFetcher, "connection-1", { qr });

    expect(fetcher).toHaveBeenCalledOnce();
    const [path, request] = fetcher.mock.calls[0];
    expect(path).toBe("/v1/court-connections/connection-1/mfa-seed");
    expect(request.method).toBe("POST");
    expect(request.headers).toBeUndefined();
    expect(request.formData).toBeInstanceOf(FormData);
    expect(request.formData.get("qr")).toBe(qr);
  });
});
