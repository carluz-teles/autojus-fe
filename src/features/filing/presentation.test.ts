import { describe, expect, it, vi } from "vitest";

import { filePeca } from "@/features/pecas/services/pecas.service";
import type { ApiFetcher } from "@/lib/api/use-api";

import { blocksNewFiling, filingPresentation } from "./presentation";
import type { FilingAttempt, FilingStatus } from "./types";

function attempt(status: FilingStatus): FilingAttempt {
  return {
    id: "attempt",
    draft_id: "draft",
    status,
    requested_at: "2026-09-07T12:00:00Z",
    finished_at: null,
    failure_reason: "",
    filing_number: "receipt-returned",
  };
}

describe("uncertain filing outcome", () => {
  it("does not label a receipt number as confirmed when finalization is pending", () => {
    const view = filingPresentation(attempt("CONFIRMACAO_PENDENTE"));
    expect(view.confirmed).toBe(false);
    expect(view.label).toBe("Protocolo aguardando confirmação");
    expect(view.receiptLabel).toBe("Referência retornada pelo tribunal");
    expect(view.message).toContain("Confira o recibo no tribunal");
  });
  it.each<FilingStatus>([
    "ENFILEIRADO",
    "PROTOCOLANDO",
    "CONFIRMACAO_PENDENTE",
    "PROTOCOLADO",
  ])("blocks another filing for %s", (status) => {
    expect(blocksNewFiling(attempt(status))).toBe(true);
  });
  it("blocks unknown statuses rather than allowing a blind retry", () => {
    expect(blocksNewFiling(attempt("NEW_STATUS" as FilingStatus))).toBe(true);
  });
  it("only confirms the successful terminal state", () => {
    expect(filingPresentation(attempt("PROTOCOLADO")).confirmed).toBe(true);
    expect(filingPresentation(attempt("FALHOU")).confirmed).toBe(false);
  });
  it("allows the server to validate a new filing only after a known failure or no attempt", () => {
    expect(blocksNewFiling(attempt("FALHOU"))).toBe(false);
    expect(blocksNewFiling(null)).toBe(false);
  });
  it("does not call the legacy manual file endpoint while confirmation is pending", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: attempt("CONFIRMACAO_PENDENTE") });
    await expect(filePeca(fetcher as ApiFetcher, "draft")).rejects.toThrow(
      "Já existe uma tentativa",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("/v1/pecas/draft/filing");
  });
  it("does not fall back to manual filing when the status fetch fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network"));
    await expect(filePeca(fetcher as ApiFetcher, "draft")).rejects.toThrow(
      "network",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
