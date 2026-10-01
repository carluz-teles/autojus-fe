// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { decisionFixture } from "../__tests__/decision-fixture";
import type { DecisionPreview } from "../services/annotation-decisions";
import { useDecisionForm } from "./use-decisions";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.decide"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  input: DecisionPreview,
  current: ReturnType<typeof useDecisionForm>;
const refresh = vi.fn();
function Harness() {
  const state = useDecisionForm(input, false, refresh);
  useEffect(() => {
    current = state;
  });
  return <p>{state.message}</p>;
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
}
function decisionReceipt() {
  return {
    data: {
      id: "synthetic-decision",
      task_id: input.task_id,
      revision: input.revision + 1,
      input_digest: input.input_digest,
      previous_decision_id: input.previous_decision_id,
      outcome: "rejected",
      annotation: null,
    },
  };
}
async function rejection() {
  await act(async () => {
    current.meta.setValue("outcome", "rejected");
    current.meta.setValue("reason", "Evidências insuficientes para admissão.");
  });
}
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.capabilities = ["curation.decide"];
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  input = decisionFixture();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  refresh.mockResolvedValue({ isSuccess: true });
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

describe("decision workflow", () => {
  it("does not write for incomplete or blocked decisions", async () => {
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    await rejection();
    input = {
      ...input,
      assessment: {
        ...input.assessment,
        ready: false,
        blockers: ["reviews_pending"],
      },
    };
    await render();
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(current.canDecide).toBe(false);
  });
  it("blocks double submission and returns the authoritative receipt", async () => {
    await rejection();
    mocks.api.mockResolvedValueOnce(decisionReceipt());
    await act(async () => {
      await Promise.all([current.submit(), current.submit()]);
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(current.receipt?.id).toBe("synthetic-decision");
    expect(current.dirty).toBe(false);
    expect(current.locked).toBe(true);
  });
  it("recovers the exact decision after a lost response and blocks other commands", async () => {
    await rejection();
    mocks.api.mockRejectedValueOnce(
      new ApiError("NETWORK", "Resposta perdida", 0),
    );
    await act(async () => {
      await current.submit();
    });
    expect(current.commands.uncertain).toBe(true);
    const command = structuredClone(mocks.api.mock.calls[0][1].body);
    await act(async () => {
      current.meta.setValue("reason", "Edição posterior");
      current.alert.setValue("reason", "Outro problema");
    });
    await act(async () => {
      await current.submit();
      await current.addAlert();
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    mocks.api.mockResolvedValueOnce(decisionReceipt());
    await act(async () => {
      await current.recover();
    });
    expect(mocks.api.mock.calls[1][1].body).toEqual(command);
  });
  it("preserves edits and requires acknowledgment of changed reviews", async () => {
    await rejection();
    input = {
      ...input,
      revision: 1,
      previous_decision_id: "another-decision",
      input_digest: "e".repeat(64),
    };
    await render();
    expect(current.stale).toBe(true);
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api).not.toHaveBeenCalled();
    expect(current.meta.getValues("reason")).toContain("Evidências");
    await act(async () => current.acknowledgeComparison());
    mocks.api.mockResolvedValueOnce(decisionReceipt());
    await act(async () => {
      await current.submit();
    });
    expect(mocks.api.mock.calls[0][1].body).toMatchObject({
      expected_revision: 1,
      expected_input_digest: "e".repeat(64),
      previous_decision_id: "another-decision",
    });
  });
  it("forces successful refresh after conflict without losing the correction", async () => {
    await rejection();
    mocks.api.mockRejectedValueOnce(
      new ApiError("CONFLICT", "Comparação antiga", 409),
    );
    await act(async () => {
      await current.submit();
    });
    await act(async () => current.acknowledgeComparison());
    expect(current.stale).toBe(true);
    refresh.mockResolvedValueOnce({ isSuccess: false });
    await act(async () => {
      await current.refreshComparison();
    });
    await act(async () => current.acknowledgeComparison());
    expect(current.stale).toBe(true);
    await act(async () => {
      await current.refreshComparison();
    });
    await act(async () => current.acknowledgeComparison());
    expect(current.stale).toBe(false);
    expect(current.meta.getValues("reason")).toContain("Evidências");
  });
  it("records critical alerts even when reviews are pending and refreshes their requirements", async () => {
    input = { ...input, assessment: { ...input.assessment, ready: false } };
    await render();
    await act(async () =>
      current.alert.setValue("reason", "Destinatário divergente."),
    );
    mocks.api.mockResolvedValueOnce({
      data: {
        id: "alert",
        task_id: input.task_id,
        reason: "Destinatário divergente.",
      },
    });
    await act(async () => {
      await current.addAlert();
    });
    expect(mocks.api.mock.calls[0][0]).toContain("/critical-alerts");
    expect(current.needsRefresh).toBe(true);
  });
  it("stops writes after access changes and warns before leaving local edits", async () => {
    await rejection();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    mocks.capabilities = [];
    await render();
    await act(async () => {
      await current.submit();
      await current.addAlert();
    });
    expect(mocks.api).not.toHaveBeenCalled();
  });
});
