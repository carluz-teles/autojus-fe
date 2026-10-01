// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

import type {
  Feedback,
  FeedbackCommand,
  FeedbackReceipt,
} from "../services/feedback";
import { AiFeedback } from "./ai-feedback";

const mock = vi.hoisted(() => ({
  api: vi.fn(),
  signIn: vi.fn(),
  auth: {
    isLoaded: true,
    isSignedIn: true,
    userId: "person-a",
    orgId: "org-a",
    sessionId: "session-a",
  },
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mock.api }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mock.auth,
  useClerk: () => ({ openSignIn: mock.signIn }),
}));
const resultA = "018f0bf8-6e67-7000-8000-000000000001",
  resultB = "018f0bf8-6e67-7000-8000-000000000002";
let result: string, host: HTMLDivElement, root: Root, client: QueryClient;
let records: Map<string, Feedback>,
  receipts: Map<string, FeedbackReceipt>,
  lose: boolean,
  failure: ApiError | null;
const writes = () =>
  mock.api.mock.calls.filter(([, req]) =>
    ["PUT", "POST"].includes(req?.method),
  );
function absent(id: string): Feedback {
  return {
    result_id: id,
    dimension: "usefulness",
    revision: 0,
    status: "absent",
    helpful: null,
    updated_at: null,
  };
}
function owner(id = result) {
  return `${mock.auth.orgId}/${mock.auth.userId}/${id}`;
}
async function flush() {
  for (let i = 0; i < 4; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 15));
    });
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <AiFeedback resultId={result} />
      </QueryClientProvider>,
    ),
  );
  await flush();
}
function button(text: string) {
  const b = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  );
  if (!b) throw new Error(`Button missing: ${text}; ${host.textContent}`);
  return b;
}
async function click(text: string) {
  await act(async () => button(text).click());
  await flush();
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.auth = {
    isLoaded: true,
    isSignedIn: true,
    userId: "person-a",
    orgId: "org-a",
    sessionId: "session-a",
  };
  verifyOrganizationTransition(beginOrganizationTransition(), "org-a");
  result = resultA;
  records = new Map();
  receipts = new Map();
  lose = false;
  failure = null;
  mock.api.mockImplementation(
    async (
      path: string,
      req: { method?: string; body?: FeedbackCommand["body"] },
    ) => {
      const id = path.split("/")[3],
        key = owner(id);
      if (failure) throw failure;
      if (!req?.method) return { data: records.get(key) ?? absent(id) };
      const body = req.body!;
      const old = receipts.get(body.request_id);
      if (old) return { data: { ...old, replayed: true } };
      const current = records.get(key) ?? absent(id);
      if (current.revision !== body.expected_revision)
        throw new ApiError("CONFLICT", "Revision", 409, {
          code: "revision_conflict",
        });
      const withdraw = path.endsWith("withdrawals");
      const receipt: FeedbackReceipt = {
        ...absent(id),
        ...(!withdraw && "helpful" in body ? body : {}),
        status: withdraw ? "withdrawn" : "active",
        helpful: "helpful" in body ? body.helpful : null,
        revision: current.revision + 1,
        updated_at: "2026-10-01T12:00:00Z",
        request_id: body.request_id,
        replayed: false,
      };
      records.set(key, receipt);
      receipts.set(body.request_id, receipt);
      if (lose) {
        lose = false;
        throw new ApiError("NETWORK", "Lost", 0);
      }
      return { data: receipt };
    },
  );
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
  vi.useRealTimers();
});

it("votes No without required text, changes to Yes, and withdraws with no implicit negative", async () => {
  expect(writes()).toHaveLength(0);
  expect(button("Não").getAttribute("aria-pressed")).toBe("false");
  await click("Não");
  expect(writes()).toHaveLength(1);
  expect(writes()[0][1].body).toMatchObject({
    helpful: false,
    expected_revision: 0,
    comment: "",
  });
  expect(button("Não").getAttribute("aria-pressed")).toBe("true");
  await click("Sim");
  expect(records.get(owner())).toMatchObject({ revision: 2, helpful: true });
  await click("Retirar feedback");
  expect(records.get(owner())).toMatchObject({
    revision: 3,
    status: "withdrawn",
    helpful: null,
  });
  expect(writes()[2][1].body).not.toHaveProperty("helpful");
  expect(host.textContent).toContain("Feedback retirado");
});

it("recovers the exact uncertain command and does not regress a newer revision on historical replay", async () => {
  lose = true;
  await click("Não");
  const original = structuredClone(writes()[0][1].body);
  expect(button("Sim").disabled).toBe(true);
  expect(host.textContent).not.toContain("Obrigado");
  records.set(owner(), {
    ...records.get(owner())!,
    revision: 2,
    helpful: true,
  });
  await click("Tentar novamente");
  expect(writes()).toHaveLength(2);
  expect(writes()[1][1].body).toEqual(original);
  expect(button("Sim").getAttribute("aria-pressed")).toBe("true");
  expect(button("Não").getAttribute("aria-pressed")).toBe("false");
});

it("reconciles revision conflicts without automatic resubmission", async () => {
  records.set(owner(), {
    ...absent(result),
    status: "active",
    helpful: true,
    revision: 1,
    updated_at: "2026-10-01T12:00:00Z",
  });
  await click("Não");
  expect(writes()).toHaveLength(1);
  expect(host.textContent).toContain("mudou em outra aba");
  expect(button("Sim").getAttribute("aria-pressed")).toBe("true");
  await click("Não");
  expect(writes()[1][1].body.expected_revision).toBe(1);
  expect(writes()[1][1].body.request_id).not.toBe(
    writes()[0][1].body.request_id,
  );
});

it("preserves a private correction through an uncertain save and renders it as text", async () => {
  await click("Sim");
  await click("Adicionar ou editar comentário");
  const comment = host.querySelectorAll("textarea")[0];
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(comment, "<script>private</script>");
    comment.dispatchEvent(new Event("input", { bubbles: true }));
  });
  lose = true;
  await click("Salvar comentário");
  expect(writes()[1][1].body.comment).toBe("<script>private</script>");
  expect(comment.value).toBe("<script>private</script>");
  expect(host.querySelector("script")).toBeNull();
  await click("Tentar novamente");
  expect(writes()[2][1].body).toEqual(writes()[1][1].body);
});

it("isolates result, organization and person, and removes controls during a transition", async () => {
  await click("Não");
  result = resultB;
  await render();
  expect(button("Não").getAttribute("aria-pressed")).toBe("false");
  result = resultA;
  mock.auth.userId = "person-b";
  await render();
  expect(button("Não").getAttribute("aria-pressed")).toBe("false");
  await act(async () => {
    beginOrganizationTransition();
  });
  expect(host.textContent).toBe("");
  mock.auth.orgId = "org-b";
  await act(async () => {
    verifyOrganizationTransition(beginOrganizationTransition(), "org-b");
  });
  await render();
  expect(button("Não").getAttribute("aria-pressed")).toBe("false");
  expect(writes()).toHaveLength(1);
});

it("aborts a pending write on identity change and ignores its late completion", async () => {
  let release!: (value: unknown) => void;
  mock.api.mockImplementationOnce(
    (_path, req) =>
      new Promise((r) => {
        release = r;
        expect(req.method).toBe("PUT");
      }),
  );
  await click("Sim");
  const signal = writes()[0][1].signal as AbortSignal;
  const body = writes()[0][1].body;
  mock.auth.userId = "person-b";
  await render();
  expect(signal.aborted).toBe(true);
  await act(async () =>
    release({
      data: {
        ...absent(result),
        status: "active",
        helpful: true,
        revision: 1,
        updated_at: "2026-10-01T12:00:00Z",
        request_id: body.request_id,
        replayed: false,
      },
    }),
  );
  await flush();
  expect(button("Sim").getAttribute("aria-pressed")).toBe("false");
  expect(host.textContent).not.toContain("Obrigado");
});

it("hides private fields after access loss and offers reauthentication for 401", async () => {
  await click("Sim");
  await click("Adicionar ou editar comentário");
  failure = new ApiError("FORBIDDEN", "Revoked", 403);
  await click("Salvar comentário");
  expect(host.querySelector("textarea")).toBeNull();
  expect(button("Sim").disabled).toBe(true);
  failure = new ApiError("UNAUTHENTICATED", "Expired", 401);
  await click("Atualizar feedback");
  await click("Entrar novamente");
  expect(mock.signIn).toHaveBeenCalledOnce();
});

it("waits for Retry-After without automatically repeating writes", async () => {
  failure = new ApiError("RATE_LIMITED", "Wait", 429, undefined, 2);
  await click("Sim");
  expect(button("Tentar novamente").disabled).toBe(true);
  expect(writes()).toHaveLength(1);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 2100));
  });
  failure = null;
  await click("Tentar novamente");
  expect(writes()).toHaveLength(2);
  expect(writes()[1][1].body).toEqual(writes()[0][1].body);
});

it("bounds result projection retries and never sends votes while not ready", async () => {
  failure = new ApiError("CONFLICT", "Pending", 409, {
    code: "result_not_ready",
    retry_after_seconds: 0.01,
  });
  result = resultB;
  mock.api.mockClear();
  await render();
  await flush();
  expect(mock.api).toHaveBeenCalledTimes(3);
  expect(writes()).toHaveLength(0);
  expect(button("Sim").disabled).toBe(true);
  expect(host.textContent).toContain("sendo sincronizada");
});

it("does not resend a confirmed write when reconciliation GET fails", async () => {
  const original = mock.api.getMockImplementation()!;
  let committed = false;
  mock.api.mockImplementation(async (path, req) => {
    if (!req?.method && committed)
      throw new ApiError("NETWORK", "Read lost", 0);
    const response = await original(path, req);
    if (req?.method) committed = true;
    return response;
  });
  await click("Sim");
  expect(writes()).toHaveLength(1);
  expect(host.textContent).toContain("Não foi possível consultar");
  expect(host.textContent).not.toContain("Tentar novamente");
  expect(button("Sim").disabled).toBe(true);
  committed = false;
  await click("Atualizar feedback");
  expect(writes()).toHaveLength(1);
  expect(button("Sim").getAttribute("aria-pressed")).toBe("true");
});

it("cancels an old read and prevents its private content reaching a different result", async () => {
  let release!: (value: unknown) => void;
  let signal!: AbortSignal;
  mock.api.mockImplementationOnce(
    (_path, req) =>
      new Promise((resolve) => {
        signal = req.signal;
        release = resolve;
      }),
  );
  await act(async () => {
    void client.invalidateQueries({ queryKey: ["ai-feedback"] });
  });
  await flush();
  result = resultB;
  await render();
  expect(signal.aborted).toBe(true);
  await act(async () =>
    release({
      data: {
        ...absent(resultA),
        status: "active",
        helpful: true,
        revision: 1,
        updated_at: "2026-10-01T12:00:00Z",
        comment: "private old result",
      },
    }),
  );
  await flush();
  expect(host.textContent).not.toContain("private old result");
  expect(button("Sim").getAttribute("aria-pressed")).toBe("false");
  expect(writes()).toHaveLength(0);
});
