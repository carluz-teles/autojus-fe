import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  exportDraftPDF,
  getDocumentRender,
  renderDraftPDF,
} from "./pecas-v2.service";

describe("PDF export API contract", () => {
  it("requests the legacy PDF only for the no-template route", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { url: "https://storage/legacy" } });
    await expect(
      exportDraftPDF(fetcher as ApiFetcher, "piece-1"),
    ).resolves.toBe("https://storage/legacy");
    expect(fetcher).toHaveBeenCalledWith("/v1/pecas/piece-1/export", {
      query: { format: "pdf" },
    });
  });
  it("pins the template and idempotency key on the render request", async () => {
    const render = {
      id: "render-1",
      status: "READY",
      pdf_url: "https://storage/render",
    };
    const fetcher = vi.fn().mockResolvedValue({ data: render });
    await expect(
      renderDraftPDF(fetcher as ApiFetcher, "piece-1", "tv1", "stable-key"),
    ).resolves.toBe(render);
    expect(fetcher).toHaveBeenCalledWith("/v1/pecas/piece-1/renders", {
      method: "POST",
      headers: { "Idempotency-Key": "stable-key" },
      body: { template_version_id: "tv1" },
    });
  });
  it("refreshes an existing render by its stored ID", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: { id: "render-1", pdf_url: "https://storage/fresh" },
    });
    await getDocumentRender(fetcher as ApiFetcher, "render-1");
    expect(fetcher).toHaveBeenCalledWith("/v1/document-renders/render-1");
  });
});
