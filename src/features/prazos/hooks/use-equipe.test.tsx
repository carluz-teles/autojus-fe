// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orgId: "org_1",
  selfId: "be_self",
  dataUpdatedAt: 1,
  isSuccess: true,
  fetch: vi.fn(),
  members: [
    { id: "be_self", name: "Self", email: "self@example.com", role: "ADMIN" },
    {
      id: "be_other",
      name: "Other",
      email: "other@example.com",
      role: "LAWYER",
    },
  ],
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: mocks.orgId }),
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: mocks.email } },
  }),
}));
vi.mock("@/features/onboarding/hooks/use-me", () => ({
  useMe: () => ({ data: { user_id: mocks.selfId } }),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));
vi.mock("@/features/organization/hooks/use-org-members-directory", () => ({
  useOrgMembersDirectory: () => ({
    members: mocks.members,
    dataUpdatedAt: mocks.dataUpdatedAt,
    isSuccess: mocks.isSuccess,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useEquipe } from "./use-equipe";

let latest: ReturnType<typeof useEquipe>;
function Probe() {
  const state = useEquipe();
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("team member removal", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.orgId = "org_1";
    mocks.dataUpdatedAt = 1;
    mocks.isSuccess = true;
    mocks.members = [
      { id: "be_self", name: "Self", email: "self@example.com", role: "ADMIN" },
      {
        id: "be_other",
        name: "Other",
        email: "other@example.com",
        role: "LAWYER",
      },
    ];
    mocks.fetch.mockReset().mockResolvedValue(undefined);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    client.clear();
    vi.unstubAllGlobals();
  });
  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  }
  it("uses BE IDs, keeps self unavailable, and suppresses a removed row only in its org", async () => {
    await render();
    expect(latest.lista.find((m) => m.id === "be_self")?.isSelf).toBe(true);
    expect(latest.lista.find((m) => m.id === "be_other")?.isSelf).toBe(false);
    await act(async () =>
      latest.lista.find((m) => m.id === "be_other")?.requestRemoval(),
    );
    await act(async () => {
      await latest.remove();
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/v1/organization/members/be_other",
      { method: "DELETE" },
    );
    expect(latest.lista.map((m) => m.id)).toEqual(["be_self"]);
    mocks.orgId = "org_2";
    await render();
    expect(latest.lista.map((m) => m.id)).toContain("be_other");
    mocks.orgId = "org_1";
    await render();
    expect(latest.lista.map((m) => m.id)).not.toContain("be_other");
  });
  it("keeps a stale row hidden, clears tombstone only after fresh absence, then shows reactivation", async () => {
    await render();
    await act(async () =>
      latest.lista.find((m) => m.id === "be_other")?.requestRemoval(),
    );
    await act(async () => {
      await latest.remove();
    });
    expect(latest.lista.map((m) => m.id)).not.toContain("be_other");
    mocks.dataUpdatedAt = 2;
    await render(); // successful fresh response still contains pre-webhook projection
    expect(latest.lista.map((m) => m.id)).not.toContain("be_other");
    mocks.isSuccess = false;
    mocks.members = mocks.members.filter((m) => m.id !== "be_other");
    mocks.dataUpdatedAt = 3;
    await render(); // loading/default absence does not clear suppression
    expect(
      client.getQueryData(["organization", "removed-members", "org_1"]),
    ).toHaveProperty("be_other");
    mocks.isSuccess = true;
    await render(); // fresh matching-org absence confirms deletion
    expect(
      client.getQueryData(["organization", "removed-members", "org_1"]),
    ).not.toHaveProperty("be_other");
    mocks.members = [
      ...mocks.members,
      {
        id: "be_other",
        name: "Other",
        email: "other@example.com",
        role: "LAWYER",
      },
    ];
    mocks.dataUpdatedAt = 4;
    await render();
    expect(latest.lista.map((m) => m.id)).toContain("be_other");
  });
  it("keeps a member visible when removal fails", async () => {
    mocks.fetch.mockRejectedValue(new Error("forbidden"));
    await render();
    await act(async () =>
      latest.lista.find((m) => m.id === "be_other")?.requestRemoval(),
    );
    await act(async () => {
      await latest.remove();
    });
    expect(latest.lista.map((m) => m.id)).toContain("be_other");
    expect(latest.lista.find((m) => m.id === "be_other")?.error).toContain(
      "Não foi possível",
    );
  });
});
