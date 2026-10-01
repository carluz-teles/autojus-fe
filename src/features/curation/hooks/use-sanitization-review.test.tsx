// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type SyntheticEvent, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ImportPrivacyPolicy } from "../services/import-admission";
import type { ImportBatch, ImportItem } from "../services/imports";
import { useSanitizationReview } from "./use-sanitization-review";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));

const item: ImportItem = {
  id: "item-synthetic",
  row_number: 1,
  snapshot_digest: "a".repeat(64),
  state: "awaiting_privacy",
  errors: [],
  duplicate_rows: [],
  duplicate_ids: [],
  input: {
    text: "Intime-se João em 15 dias úteis.",
    origin: "synthetic",
    source_kind: "manual_import",
    source_reference: "synthetic:source",
    captured_at: "2026-09-01T00:00:00Z",
    group_key: "synthetic:process",
    context: {
      court: "synthetic:court",
      procedure: "common",
      channel: "synthetic",
      legal_date: "2026-09-01",
      publication_date: null,
      recipient_role: null,
      notes: null,
    },
  },
};
const policy: ImportPrivacyPolicy = {
  configured: false,
  revision: 0,
  sanitization_version: "intimation-redaction-v1",
  consent_reference: "",
  anonymization_reference: "",
  retention_reference: "",
  withdrawal_reference: "",
  small_group_reference: "",
};
const originalBatch: ImportBatch = {
  id: "batch-synthetic",
  name: "Synthetic",
  schema_version: "intimation-import-v1",
  state: "confirmed",
  revision: 2,
  created_at: "2026-09-01T00:00:00Z",
  counts: { awaiting_privacy: 1 },
  items: [item],
};
let current: ReturnType<typeof useSanitizationReview>, batch: ImportBatch;
function Harness() {
  const value = useSanitizationReview(batch, item, policy);
  useEffect(() => {
    current = value;
  });
  return (
    <form onSubmit={value.admission.submit}>
      <p>{value.admission.form.formState.errors.root?.serverError?.message}</p>
    </form>
  );
}
let root: Root, host: HTMLDivElement, client: QueryClient;
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  batch = { ...originalBatch };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

async function approve() {
  await act(async () => {
    const form = current.admission.form;
    form.setValue("matter_key", "civel");
    form.setValue("knowledge_as_of", "2026-09-29T00:00:00Z");
    form.setValue("reviewed_at", "2026-09-29T00:00:00Z");
    form.setValue("dataset_key", "synthetic:pilot");
    form.setValue("review_receipt", "synthetic:review");
    form.setValue("privacy_reviewed", true);
    form.setValue("meaning_status", "preserved");
    form.setValue("evaluation", true);
  });
}

describe("sanitization review recovery", () => {
  it("invalidates acknowledgements when the preview changes", async () => {
    await approve();
    await act(async () => {
      current.editor.selectText({
        currentTarget: { selectionStart: 10, selectionEnd: 14 },
      } as SyntheticEvent<HTMLTextAreaElement>);
    });
    await act(async () => {
      current.editor.add();
    });
    expect(current.editor.preview[0].text).toBe(
      "Intime-se [PESSOA_1] em 15 dias úteis.",
    );
    expect(current.admission.form.getValues("privacy_reviewed")).toBe(false);
    expect(current.admission.form.getValues("meaning_status")).toBe(
      "uncertain",
    );
    await act(async () => {
      await current.admission.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("preserves a review across uncertain network failure and replays the same command", async () => {
    mocks.api
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({
        data: { source_link_id: "receipt", idempotent_replay: true },
      });
    await approve();
    await act(async () => {
      await current.admission.submit();
    });
    expect(host.textContent).toContain("Connection lost");
    await act(async () => {
      await current.admission.submit();
    });
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(mocks.api.mock.calls[0][1].body).toEqual(
      mocks.api.mock.calls[1][1].body,
    );
    const body = mocks.api.mock.calls[1][1].body;
    expect(body.consent_receipt).toBe("");
    expect(body.privacy_policy_revision).toBe(0);
    expect(body.tenant_id).toBeUndefined();
    expect(body.sanitization.purposes).toEqual(["evaluation"]);
  });
  it("requires explicit reconciliation while retaining review inputs after revision change", async () => {
    await approve();
    batch = { ...batch, revision: 3 };
    await render();
    expect(current.admission.outdated).toBe(true);
    expect(current.admission.form.getValues("expected_batch_revision")).toBe(2);
    await act(async () => current.admission.reconcile());
    expect(current.admission.outdated).toBe(false);
    expect(current.admission.form.getValues("review_receipt")).toBe(
      "synthetic:review",
    );
    expect(current.admission.form.getValues("privacy_reviewed")).toBe(false);
  });
});
