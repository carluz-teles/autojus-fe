// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { transitionSnapshot } from "@/lib/auth/organization-transition";

const mocks = vi.hoisted(() => ({
  auth: {
    isLoaded: true,
    userId: "person-internal",
    orgId: "org_internal",
    sessionId: "session-internal",
  },
  api: vi.fn(),
  setActive: vi.fn(),
  signOut: vi.fn(),
  token: vi.fn(),
}));
const clerk = {
  setActive: mocks.setActive,
  signOut: mocks.signOut,
  session: { getToken: mocks.token },
};
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mocks.auth,
  useClerk: () => clerk,
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));

import { BackofficeBoundary, BackofficeGate } from "./backoffice-boundary";

let root: Root;
let host: HTMLDivElement;
let tasks: QueryClient[];
const session = {
  organization_id: "org_internal",
  tenant_id: "tenant_internal",
  user_id: "operator_internal",
  revision: 1,
  capabilities: ["curation.read"],
  requires_organization_switch: false,
};

function PrivateTask() {
  const client = useQueryClient();
  useQuery({
    queryKey: ["private-task"],
    queryFn: async () => "private text",
    initialData: "private text",
    enabled: false,
  });
  useEffect(() => {
    tasks.push(client);
  }, [client]);
  return <p>Private task content</p>;
}

async function settles(assertion: () => void) {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    assertion();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.auth.orgId = "org_internal";
  mocks.auth.userId = "person-internal";
  mocks.api.mockResolvedValue({ data: session });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  tasks = [];
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("backoffice access boundary", () => {
  it("never mounts a private child for a customer admin", async () => {
    mocks.api.mockRejectedValue(
      new ApiError("FORBIDDEN", "Internal access required", 403),
    );
    await act(async () =>
      root.render(
        <BackofficeBoundary>
          <PrivateTask />
        </BackofficeBoundary>,
      ),
    );
    await settles(() =>
      expect(host.textContent).toContain("Sua conta não tem acesso"),
    );
    expect(host.textContent).not.toContain("Private task content");
    expect(tasks).toHaveLength(0);
    expect(transitionSnapshot().blocked).toBe(true);
    expect(mocks.api).toHaveBeenCalledTimes(1);
  });

  it("unmounts tasks and clears their cache immediately after revocation", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <BackofficeGate>
            <PrivateTask />
          </BackofficeGate>
        </QueryClientProvider>,
      ),
    );
    await settles(() =>
      expect(host.textContent).toContain("Private task content"),
    );
    expect(tasks[0].getQueryData(["private-task"])).toBe("private text");
    mocks.api.mockRejectedValue(new ApiError("FORBIDDEN", "Revoked", 403));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["backoffice-session"] });
    });
    await settles(() =>
      expect(host.textContent).toContain("Sua conta não tem acesso"),
    );
    expect(host.textContent).not.toContain("Private task content");
    expect(tasks[0].getQueryCache().getAll()).toHaveLength(0);
    expect(transitionSnapshot().blocked).toBe(true);
  });

  it("requires an explicit internal organization switch and replaces caches", async () => {
    await act(async () =>
      root.render(
        <BackofficeBoundary>
          <PrivateTask />
        </BackofficeBoundary>,
      ),
    );
    await settles(() => expect(tasks).toHaveLength(1));
    mocks.auth.orgId = "org_customer";
    mocks.api.mockResolvedValue({
      data: { ...session, requires_organization_switch: true },
    });
    await act(async () =>
      root.render(
        <BackofficeBoundary>
          <PrivateTask />
        </BackofficeBoundary>,
      ),
    );
    await settles(() =>
      expect(host.textContent).toContain("Entrar na curadoria"),
    );
    expect(host.textContent).not.toContain("Private task content");
    expect(tasks[0].getQueryCache().getAll()).toHaveLength(0);
    expect(mocks.setActive).not.toHaveBeenCalled();
    const button = Array.from(host.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("Entrar na curadoria"),
    );
    await act(async () => button?.click());
    await settles(() =>
      expect(mocks.setActive).toHaveBeenCalledWith({
        organization: "org_internal",
      }),
    );
  });

  it("does not remount a task while sign-out is pending", async () => {
    let finish!: () => void;
    mocks.signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await act(async () =>
      root.render(
        <BackofficeBoundary>
          <PrivateTask />
        </BackofficeBoundary>,
      ),
    );
    await settles(() => expect(tasks).toHaveLength(1));
    const button = Array.from(host.querySelectorAll("button")).find(
      (element) => element.textContent === "Sair",
    );
    await act(async () => button?.click());
    await settles(() =>
      expect(host.textContent).not.toContain("Private task content"),
    );
    expect(transitionSnapshot().blocked).toBe(true);
    expect(tasks[0].getQueryCache().getAll()).toHaveLength(0);
    mocks.auth.userId = "";
    await act(async () => {
      finish();
      root.render(
        <BackofficeBoundary>
          <PrivateTask />
        </BackofficeBoundary>,
      );
    });
  });
});
