// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Me } from "@/features/onboarding/types";
import { beginOrganizationTransition } from "@/lib/auth/organization-transition";

const mocks = vi.hoisted(() => ({
  orgId: "org-b" as string | null,
  memberships: [{ organization: { id: "org-b", name: "Beta" } }],
  order: [] as string[],
  setActive: vi.fn(),
  getToken: vi.fn(),
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  apiFetch: vi.fn(),
  activateAndVerifyOrganization: vi.fn(),
  tenantUnmounted: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, orgId: mocks.orgId, userId: "user-1" }),
  useClerk: () => ({
    session: { getToken: mocks.getToken },
    signOut: vi.fn(),
  }),
  useUser: () => ({ user: { firstName: null, lastName: null } }),
  useOrganizationList: () => ({
    isLoaded: true,
    setActive: mocks.setActive,
    userMemberships: {
      data: mocks.memberships,
      isLoading: false,
      isFetching: false,
      isError: false,
      hasNextPage: false,
      revalidate: vi.fn(),
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.routerReplace,
    refresh: mocks.routerRefresh,
  }),
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/lib/auth/organization-transition", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  activateAndVerifyOrganization: mocks.activateAndVerifyOrganization,
}));
vi.mock("@/features/onboarding/components/personal-profile", () => ({
  PersonalProfile: () => <div>Personal profile required</div>,
}));
vi.mock("@/features/onboarding/components/onboarding-flow", () => ({
  OnboardingFlow: () => <div>Company onboarding</div>,
}));

import { OrganizationCoordinator } from "./organization-coordinator";

const readyOrg: Me = {
  user_id: "user-1",
  tenant_id: "tenant-b",
  clerk_org_id: "org-b",
  profile_onboarding_completed_at: null,
  organization_state: "ready",
  onboarding_completed_at: "2026-09-28T12:00:00Z",
  role: "LAWYER",
  account_type: "firm",
};
const noOrg: Me = {
  ...readyOrg,
  tenant_id: null,
  clerk_org_id: "",
  organization_state: "no_active_org",
  onboarding_completed_at: null,
  role: "",
  account_type: "",
};

let root: Root;
let host: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  beginOrganizationTransition();
  mocks.orgId = "org-b";
  mocks.memberships = [{ organization: { id: "org-b", name: "Beta" } }];
  mocks.order = [];
  mocks.setActive.mockImplementation(async ({ organization }) => {
    mocks.order.push("clear");
    if (organization === null) mocks.orgId = null;
  });
  mocks.getToken.mockImplementation(async () => {
    mocks.order.push("token");
    return "fresh-non-org-token";
  });
  mocks.activateAndVerifyOrganization.mockResolvedValue(readyOrg);
  mocks.apiFetch.mockImplementation(async (_path, req) => {
    const token = await req.getToken();
    mocks.order.push("identity");
    expect(token).toBe("fresh-non-org-token");
    return noOrg;
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  queryClient = new QueryClient();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function render(mode: "app" | "onboarding") {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <OrganizationCoordinator mode={mode}>
          <TenantContent />
        </OrganizationCoordinator>
      </QueryClientProvider>,
    );
  });
}

function TenantContent() {
  useEffect(() => () => mocks.tenantUnmounted(), []);
  return <div>Tenant app</div>;
}

describe("OrganizationCoordinator routing", () => {
  it("unmounts an already-ready tenant before stale-organization clearing finishes", async () => {
    mocks.activateAndVerifyOrganization.mockResolvedValue({
      ...readyOrg,
      profile_onboarding_completed_at: "2026-09-28T12:00:00Z",
    });
    await render("app");
    await vi.waitFor(() => expect(host.textContent).toContain("Tenant app"));
    expect(mocks.tenantUnmounted).not.toHaveBeenCalled();

    let finishClear!: () => void;
    mocks.setActive.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve;
        }),
    );
    mocks.memberships = [];
    await render("app");

    expect(mocks.setActive).toHaveBeenCalledWith({ organization: null });
    expect(host.textContent).not.toContain("Tenant app");
    expect(host.textContent).toContain("Preparando seu escritório");
    expect(mocks.tenantUnmounted).toHaveBeenCalledOnce();
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();

    await act(async () => finishClear());
  });

  it("does not remount a revoked tenant when clearing fails", async () => {
    mocks.activateAndVerifyOrganization.mockResolvedValue({
      ...readyOrg,
      profile_onboarding_completed_at: "2026-09-28T12:00:00Z",
    });
    await render("app");
    await vi.waitFor(() => expect(host.textContent).toContain("Tenant app"));

    mocks.setActive.mockRejectedValue(new Error("Clerk indisponível"));
    mocks.memberships = [];
    await render("app");
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Clerk indisponível"),
    );

    expect(host.textContent).not.toContain("Tenant app");
    expect(host.textContent).toContain("Tentar novamente");
    expect(mocks.tenantUnmounted).toHaveBeenCalledOnce();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it.each(["app", "onboarding"] as const)(
    "requires the personal profile before entering a ready org in %s mode",
    async (mode) => {
      await render(mode);
      await vi.waitFor(() =>
        expect(host.textContent).toContain("Personal profile required"),
      );
      expect(mocks.setActive).not.toHaveBeenCalled();
      expect(host.textContent).not.toContain("Company onboarding");
      expect(host.textContent).not.toContain("Tenant app");
      expect(mocks.routerReplace).not.toHaveBeenCalled();
    },
  );

  it.each([null, "org-removed"])(
    "routes a verified zero-membership user from app mode to onboarding (active org %s)",
    async (orgId) => {
      mocks.orgId = orgId;
      mocks.memberships = [];
      await render("app");
      await vi.waitFor(() =>
        expect(mocks.routerReplace).toHaveBeenCalledWith("/onboarding"),
      );
      if (orgId) {
        expect(mocks.setActive).toHaveBeenCalledExactlyOnceWith({
          organization: null,
        });
        expect(mocks.order).toEqual(["clear", "token", "identity"]);
      } else {
        expect(mocks.setActive).not.toHaveBeenCalled();
        expect(mocks.order).toEqual(["token", "identity"]);
      }
      expect(mocks.getToken).toHaveBeenCalledExactlyOnceWith({
        skipCache: true,
      });
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/v1/identity/me",
        expect.objectContaining({ getToken: expect.any(Function) }),
      );
      expect(host.textContent).not.toContain("Tenant app");
    },
  );

  it("keeps the company-creation wizard in onboarding mode for zero memberships", async () => {
    mocks.orgId = null;
    mocks.memberships = [];
    await render("onboarding");
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Company onboarding"),
    );
    expect(mocks.getToken).toHaveBeenCalledWith({ skipCache: true });
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("waits for stale organization removal before requesting a token or identity", async () => {
    mocks.orgId = "org-removed";
    mocks.memberships = [];
    let finishClear!: () => void;
    mocks.setActive.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishClear = () => {
            mocks.orgId = null;
            mocks.order.push("clear");
            resolve();
          };
        }),
    );

    await render("app");
    expect(mocks.setActive).toHaveBeenCalledWith({ organization: null });
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();

    await act(async () => finishClear());
    await vi.waitFor(() =>
      expect(mocks.routerReplace).toHaveBeenCalledWith("/onboarding"),
    );
    expect(mocks.order).toEqual(["clear", "token", "identity"]);
  });

  it("keeps the tenant blocked and retryable if stale organization removal fails", async () => {
    mocks.orgId = "org-removed";
    mocks.memberships = [];
    mocks.setActive.mockRejectedValue(new Error("Clerk indisponível"));

    await render("app");
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Clerk indisponível"),
    );
    expect(mocks.getToken).not.toHaveBeenCalled();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.routerReplace).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Tentar novamente");
    expect(host.textContent).not.toContain("Tenant app");
  });

  it.each([
    ["wrong state", readyOrg],
    ["wrong user", { ...noOrg, user_id: "another-user" }],
    ["active org remains", { ...noOrg, clerk_org_id: "org-removed" }],
  ])("rejects %s after clearing", async (_case, identity) => {
    mocks.orgId = "org-removed";
    mocks.memberships = [];
    mocks.apiFetch.mockImplementation(async (_path, req) => {
      await req.getToken();
      return identity;
    });

    await render("onboarding");
    await vi.waitFor(() =>
      expect(host.textContent).toContain(
        "Não foi possível confirmar sua conta",
      ),
    );
    expect(mocks.setActive).toHaveBeenCalledWith({ organization: null });
    expect(host.textContent).not.toContain("Company onboarding");
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("rejects a missing no-org marker without releasing app content or navigation", async () => {
    mocks.orgId = "org-removed";
    mocks.memberships = [];
    mocks.apiFetch.mockImplementation(async (_path, req) => {
      await req.getToken();
      return { ...noOrg, clerk_org_id: undefined };
    });

    await render("app");
    await vi.waitFor(() =>
      expect(host.textContent).toContain(
        "Não foi possível confirmar sua conta",
      ),
    );
    expect(mocks.setActive).toHaveBeenCalledWith({ organization: null });
    expect(host.textContent).toContain("Tentar novamente");
    expect(host.textContent).not.toContain("Tenant app");
    expect(host.textContent).not.toContain("Company onboarding");
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it("does not commit a late no-org identity from an obsolete transition", async () => {
    mocks.orgId = "org-removed";
    mocks.memberships = [];
    let finishIdentity!: (me: Me) => void;
    mocks.apiFetch.mockImplementation(async (_path, req) => {
      await req.getToken();
      return new Promise<Me>((resolve) => {
        finishIdentity = resolve;
      });
    });

    await render("app");
    expect(mocks.apiFetch).toHaveBeenCalled();
    beginOrganizationTransition();
    await act(async () => finishIdentity(noOrg));
    expect(host.textContent).not.toContain("Company onboarding");
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });
});
