// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { annotationFixture } from "../__tests__/annotation-fixture";
import {
  type AnnotationAssignmentInput,
  type AnnotationDraft,
  annotationKeys,
  assignmentWritable,
} from "../services/annotation-assignments";
import { annotationDefaults } from "../services/annotation-form";
import { useAnnotationForm } from "./use-annotations";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  input: AnnotationAssignmentInput,
  previousDraft: AnnotationDraft | undefined,
  current: ReturnType<typeof useAnnotationForm>;
function Harness() {
  const query = useQuery({
    queryKey: annotationKeys.input(input.assignment.id),
    queryFn: async () => input,
    initialData: input,
    enabled: false,
  });
  const value = useAnnotationForm(
    query.data,
    assignmentWritable(query.data.assignment),
    previousDraft,
  );
  useEffect(() => {
    current = value;
  });
  return <p>{value.message}</p>;
}
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  await settle();
}
function saved(revision: number) {
  return {
    data: {
      assignment: input.assignment,
      draft: {
        assignment_id: input.assignment.id,
        revision,
        updated_at: new Date().toISOString(),
      },
      idempotent_replay: false,
    },
  };
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-30T15:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  input = annotationFixture();
  previousDraft = undefined;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(annotationKeys.detail(input.assignment.id), {
    assignment: input.assignment,
    batch_id: "synthetic-batch",
  });
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("questionnaire persistence and recovery", () => {
  it("copies a previous lease draft only on request and waits for an explicit save", async () => {
    const annotation = annotationDefaults(input);
    annotation.label.abstention_reason = "Recovered from an expired lease";
    previousDraft = {
      assignment_id: "previous-assignment",
      revision: 3,
      updated_at: "2026-09-30T14:00:00Z",
      annotation,
    };
    await render();
    expect(current.form.getValues("label.abstention_reason")).toBeNull();
    await act(async () => current.copyPreviousDraft());
    expect(current.form.getValues("label.abstention_reason")).toBe(
      annotation.label.abstention_reason,
    );
    expect(current.dirty).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(mocks.api).not.toHaveBeenCalled();
    mocks.api.mockResolvedValueOnce(saved(1));
    await act(async () => {
      await current.save();
    });
    expect(mocks.api.mock.calls[0][1].body).toMatchObject({
      expected_draft_revision: 0,
      annotation,
    });
  });
  it("preserves local edits when the previous draft belongs to another frozen snapshot", async () => {
    previousDraft = {
      assignment_id: "previous-assignment",
      revision: 3,
      updated_at: "2026-09-30T14:00:00Z",
      annotation: {
        ...annotationDefaults(input),
        snapshot_digest: "f".repeat(64),
      },
    };
    await render();
    await act(async () =>
      current.form.setValue("label.abstention_reason", "Current local work"),
    );
    await act(async () => current.copyPreviousDraft());
    expect(current.form.getValues("label.abstention_reason")).toBe(
      "Current local work",
    );
    expect(current.message).toContain("outro texto ou contrato");
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("does not send a blank draft and does not replace newer edits with a delayed autosave", async () => {
    expect(current.dirty).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mocks.api).not.toHaveBeenCalled();
    let resolve!: (response: ReturnType<typeof saved>) => void;
    mocks.api
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValueOnce(saved(2));
    await act(async () =>
      current.form.setValue("label.abstention_reason", "first local draft"),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    await act(async () =>
      current.form.setValue("label.abstention_reason", "newer local draft"),
    );
    await act(async () => resolve(saved(1)));
    await settle();
    expect(current.form.getValues("label.abstention_reason")).toBe(
      "newer local draft",
    );
    expect(current.dirty).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    await settle();
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(mocks.api.mock.calls[1][1].body).toMatchObject({
      expected_draft_revision: 1,
      annotation: { label: { abstention_reason: "newer local draft" } },
    });
    expect(current.dirty).toBe(false);
  });
  it("recovers the exact uncertain request while preserving subsequent local edits", async () => {
    mocks.api
      .mockRejectedValueOnce(
        new ApiError("NETWORK", "Synthetic lost response", 0),
      )
      .mockResolvedValueOnce(saved(1));
    await act(async () =>
      current.form.setValue("label.abstention_reason", "original"),
    );
    await act(async () => {
      await current.save();
    });
    await settle();
    expect(current.commands.uncertain).toBe(true);
    const command = structuredClone(mocks.api.mock.calls[0][1].body);
    await act(async () =>
      current.form.setValue("label.abstention_reason", "edited after loss"),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
      await current.submit();
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    await act(async () => {
      await current.recover();
    });
    await settle();
    expect(mocks.api.mock.calls[1][1].body).toEqual(command);
    expect(current.form.getValues("label.abstention_reason")).toBe(
      "edited after loss",
    );
    expect(current.dirty).toBe(true);
  });
  it("requires explicit comparison before overwriting another draft revision", async () => {
    await act(async () =>
      current.form.setValue("label.abstention_reason", "local answer"),
    );
    const remote = annotationDefaults(input);
    remote.label.abstention_reason = "another tab";
    await act(async () =>
      client.setQueryData(annotationKeys.input(input.assignment.id), {
        ...input,
        draft: { ...input.draft, annotation: remote, revision: 2 },
      }),
    );
    await settle();
    expect(current.remoteConflict).toBe(true);
    expect(current.form.getValues("label.abstention_reason")).toBe(
      "local answer",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      await current.save();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    await act(async () => {
      current.compare();
      current.keepLocalDraft();
    });
    expect(current.remoteConflict).toBe(false);
    mocks.api.mockResolvedValueOnce(saved(3));
    await act(async () => {
      await current.save();
    });
    expect(mocks.api.mock.calls[0][1].body).toMatchObject({
      expected_draft_revision: 2,
      annotation: { label: { abstention_reason: "local answer" } },
    });
  });
  it("stops writes at lease expiry while preserving unsaved fields", async () => {
    await act(async () =>
      current.form.setValue(
        "label.abstention_reason",
        "preserved after expiry",
      ),
    );
    vi.setSystemTime(new Date(Date.parse(input.assignment.lease_until) + 1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(current.expired).toBe(true);
    await act(async () => {
      await current.save();
      await current.renew();
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(current.form.getValues("label.abstention_reason")).toBe(
      "preserved after expiry",
    );
  });
  it("validates complete answers and sends one submission under double click", async () => {
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(current.validationMessages.length).toBeGreaterThan(0);
    await act(async () => {
      current.form.setValue("label.answerability", "insufficient");
      current.form.setValue("label.missing_context", ["destinatário"]);
      current.form.setValue(
        "label.abstention_reason",
        "Contexto sintético insuficiente.",
      );
    });
    mocks.api.mockResolvedValueOnce({
      data: {
        assignment: { ...input.assignment, state: "submitted", revision: 2 },
        submission: {
          id: "synthetic-submission",
          assignment_id: input.assignment.id,
          digest: "c".repeat(64),
          blind_eligible: true,
          submitted_at: new Date().toISOString(),
        },
        idempotent_replay: false,
      },
    });
    await act(async () => {
      await Promise.all([current.submit(), current.submit()]);
    });
    await settle();
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(mocks.api.mock.calls[0][0]).toContain("/submissions");
    expect(current.canWrite).toBe(false);
    expect(current.dirty).toBe(false);
  });
  it("warns before leaving with unsaved work and lets the reviewer stay", async () => {
    await act(async () =>
      current.form.setValue("label.abstention_reason", "unsaved"),
    );
    const link = document.createElement("a");
    link.href = "/backoffice";
    host.append(link);
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    await act(async () => {
      link.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(current.navigation.destination).toContain("/backoffice");
    await act(async () => current.navigation.stay());
    expect(current.navigation.destination).toBeNull();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });
});
