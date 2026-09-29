import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import {
  getPlans,
  getSubscription,
  openPortal,
  startCheckout,
} from "./billing.service";

describe("getSubscription", () => {
  it("translates 404 ENTITY_NOT_FOUND into null (the 'no subscription yet' state, not an error)", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new ApiError("ENTITY_NOT_FOUND", "not found", 404));

    await expect(getSubscription(fetcher)).resolves.toBeNull();
  });

  it("propagates any other error unchanged", async () => {
    const boom = new ApiError("INTERNAL", "boom", 500);
    const fetcher = vi.fn().mockRejectedValue(boom);

    await expect(getSubscription(fetcher)).rejects.toBe(boom);
  });

  it("returns the subscription as-is on 200", async () => {
    const sub = { plan: "starter", status: "active" };
    const fetcher = vi.fn().mockResolvedValue(sub);

    await expect(getSubscription(fetcher)).resolves.toBe(sub);
  });
});

describe("getPlans", () => {
  it("unwraps the {data:[...]} envelope, never null", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [] });

    await expect(getPlans(fetcher)).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledWith("/v1/billing/plans");
  });
});

describe("startCheckout", () => {
  it("posts price_id and returns the checkout url", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ checkout_url: "https://stripe/checkout" });

    await expect(startCheckout(fetcher, "price_123")).resolves.toBe(
      "https://stripe/checkout",
    );
    expect(fetcher).toHaveBeenCalledWith("/v1/billing/checkout", {
      method: "POST",
      body: { price_id: "price_123" },
    });
  });

  it("never sends tenant_id/org_id — only price_id crosses the boundary", async () => {
    const fetcher = vi.fn().mockResolvedValue({ checkout_url: "x" });

    await startCheckout(fetcher, "price_123");
    const [, req] = fetcher.mock.calls[0];
    expect(Object.keys(req.body)).toEqual(["price_id"]);
  });
});

describe("openPortal", () => {
  it("posts with no body and returns the portal url", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ portal_url: "https://stripe/portal" });

    await expect(openPortal(fetcher)).resolves.toBe("https://stripe/portal");
    expect(fetcher).toHaveBeenCalledWith("/v1/billing/portal", {
      method: "POST",
    });
  });
});
