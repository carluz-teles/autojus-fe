// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { Draft } from "../types";
import {
  type AcceptedGeneration,
  isStaleAcceptedSnapshot,
  useDraft,
} from "./use-draft";
import { useGenerateDraft } from "./use-theses";

const mocks = vi.hoisted(() => ({ getDraft: vi.fn(), run: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../services/pecas-v2.service", async (importOriginal) => ({
  ...(await importOriginal()),
  getDraft: (...args: unknown[]) => mocks.getDraft(...args),
}));
vi.mock("../lib/assessment-lifecycle", () => ({
  runAssessmentAndGenerate: (...args: unknown[]) => mocks.run(...args),
}));

const previous = {
  id: "draft-1",
  status: "DRAFT",
  sagaState: "CREATED",
  contentHtml: "",
  updatedAt: "2026-09-25T11:00:00Z",
  currentVersionId: null,
} as Draft;

let latest: {
  draft: ReturnType<typeof useDraft>;
  generate: ReturnType<typeof useGenerateDraft>;
  accept: (result: { updated_at?: string }) => void;
};

function Probe() {
  const [accepted, setAccepted] = useState<AcceptedGeneration | null>(null);
  const draft = useDraft("draft-1", accepted);
  const generate = useGenerateDraft("draft-1");
  useEffect(() => {
    latest = {
      draft,
      generate,
      accept: (result) =>
        setAccepted({
          at: Date.now(),
          updatedAt: result.updated_at,
          previousUpdatedAt: draft.data?.updatedAt,
        }),
    };
  });
  return null;
}

afterEach(() => {
  mocks.getDraft.mockReset();
  mocks.run.mockReset();
  vi.unstubAllGlobals();
});

async function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    ),
  );
  return async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  };
}

it("202 sem updated_at separa FAILED antigo de FAILED novo", () => {
  const accepted = { at: Date.now(), previousUpdatedAt: previous.updatedAt };
  expect(
    isStaleAcceptedSnapshot({ ...previous, sagaState: "FAILED" }, accepted),
  ).toBe(true);
  expect(
    isStaleAcceptedSnapshot(
      { ...previous, sagaState: "FAILED", updatedAt: "2026-09-25T12:01:00Z" },
      accepted,
    ),
  ).toBe(false);
  expect(
    isStaleAcceptedSnapshot(
      { ...previous, sagaState: "FAILED", updatedAt: "" },
      { at: Date.now() - 5_001 },
    ),
  ).toBe(false);
});

it.each(["CREATED", "FAILED"] as const)(
  "202 aceito continua observando GET %s antigo até DRAFTED",
  async (oldSaga) => {
    const old = { ...previous, sagaState: oldSaga };
    mocks.run.mockResolvedValue({});
    mocks.getDraft
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(old)
      .mockResolvedValue({
        ...previous,
        sagaState: "DRAFTED",
        contentHtml: "<p>Peça gerada</p>",
        updatedAt: "2026-09-25T12:01:00Z",
      });
    const unmount = await mount();
    try {
      await vi.waitFor(() =>
        expect(latest.draft.data?.sagaState).toBe(oldSaga),
      );
      await act(async () => {
        await latest.generate.mutateAsync(
          { thesisIds: ["t1"], expectedCurrentVersionId: null },
          { onSuccess: latest.accept },
        );
      });
      await vi.waitFor(
        () => expect(latest.draft.data?.contentHtml).toBe("<p>Peça gerada</p>"),
        { timeout: 5_000 },
      );
      expect(mocks.getDraft).toHaveBeenCalledTimes(3);
      expect(mocks.run).toHaveBeenCalledOnce();
    } finally {
      await unmount();
    }
  },
  8_000,
);

it.each(["DRAFTED", "REVIEWED"] as const)(
  "regeração aceita não conclui com GET %s da versão anterior",
  async (oldSaga) => {
    const old = {
      ...previous,
      sagaState: oldSaga,
      contentHtml: "<p>Minuta anterior</p>",
      currentVersionId: "version-1",
    };
    mocks.run.mockResolvedValue({ updated_at: "2026-09-25T12:00:00Z" });
    mocks.getDraft
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(old)
      .mockResolvedValue({
        ...old,
        sagaState: "DRAFTED",
        contentHtml: "<p>Minuta nova</p>",
        updatedAt: "2026-09-25T12:01:00Z",
      });
    const unmount = await mount();
    try {
      await vi.waitFor(() =>
        expect(latest.draft.data?.contentHtml).toBe("<p>Minuta anterior</p>"),
      );
      await act(async () => {
        await latest.generate.mutateAsync(
          {
            thesisIds: ["t1"],
            expectedCurrentVersionId: "version-1",
            revision: "revision-1",
          },
          { onSuccess: latest.accept },
        );
      });
      await vi.waitFor(
        () => expect(latest.draft.data?.contentHtml).toBe("<p>Minuta nova</p>"),
        { timeout: 5_000 },
      );
      expect(mocks.getDraft).toHaveBeenCalledTimes(3);
      expect(mocks.run).toHaveBeenCalledOnce();
    } finally {
      await unmount();
    }
  },
  8_000,
);

it("rascunho CREATED ocioso não inicia polling", async () => {
  mocks.getDraft.mockResolvedValue(previous);
  const unmount = await mount();
  try {
    await vi.waitFor(() =>
      expect(latest.draft.data?.sagaState).toBe("CREATED"),
    );
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(mocks.getDraft).toHaveBeenCalledOnce();
  } finally {
    await unmount();
  }
}, 4_000);
