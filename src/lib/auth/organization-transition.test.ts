import { describe, expect, it, vi } from "vitest";

import {
  activateAndVerifyOrganization,
  beginOrganizationTransition,
  isCurrentOrganizationRequest,
  registerOrganizationRequest,
  selectOrganizationTarget,
  transitionSnapshot,
  verifyOrganizationTransition,
} from "./organization-transition";

describe("organization transition barrier", () => {
  it("activates, obtains a fresh target token, then verifies identity with that exact token", async () => {
    const events: string[] = [];
    const setActive = vi.fn(async (id: string) => {
      events.push(`active:${id}`);
    });
    const freshToken = vi.fn(async (id: string) => {
      events.push(`fresh:${id}`);
      return "token-B";
    });
    const getIdentity = vi.fn(async (token: string) => {
      events.push(`identity:${token}`);
      return { clerk_org_id: "org_B", user_id: "user_1" };
    });
    await expect(
      activateAndVerifyOrganization(
        "org_B",
        "user_1",
        setActive,
        freshToken,
        getIdentity,
      ),
    ).resolves.toEqual({ clerk_org_id: "org_B", user_id: "user_1" });
    expect(events).toEqual(["active:org_B", "fresh:org_B", "identity:token-B"]);
    expect(getIdentity).toHaveBeenCalledExactlyOnceWith("token-B");
  });

  it("rejects missing tokens and wrong organization identities", async () => {
    const setActive = vi.fn(async () => {});
    const fetchIdentity = vi.fn(async () => ({
      clerk_org_id: "org_A",
      user_id: "user_1",
    }));
    await expect(
      activateAndVerifyOrganization(
        "org_B",
        "user_1",
        setActive,
        async () => null,
        fetchIdentity,
      ),
    ).rejects.toThrow("token");
    expect(fetchIdentity).not.toHaveBeenCalled();
    await expect(
      activateAndVerifyOrganization(
        "org_B",
        "user_1",
        setActive,
        async () => "token-B",
        fetchIdentity,
      ),
    ).rejects.toThrow("confirmar");
    await expect(
      activateAndVerifyOrganization(
        "org_B",
        "user_1",
        setActive,
        async () => "token-B",
        async () => ({ clerk_org_id: "org_B", user_id: "user_other" }),
      ),
    ).rejects.toThrow("confirmar");
  });
  it("prioritizes a membership backed invitation and never guesses among multiple memberships", () => {
    expect(selectOrganizationTarget(["org_A", "org_B"], "org_A", "org_B")).toBe(
      "org_B",
    );
    expect(
      selectOrganizationTarget(["org_A", "org_B"], null, "org_C"),
    ).toBeNull();
    expect(selectOrganizationTarget(["org_A"], "org_A", "org_B")).toBeNull();
    expect(selectOrganizationTarget(["org_A"], null, null)).toBe("org_A");
    expect(selectOrganizationTarget([], null, "org_C")).toBeNull();
  });
  it("blocks old requests synchronously, aborts in flight work, and only releases a verified generation", () => {
    const first = beginOrganizationTransition();
    expect(verifyOrganizationTransition(first, "org_A")).toBe(true);
    const controller = new AbortController();
    registerOrganizationRequest(controller);
    expect(isCurrentOrganizationRequest(first, "org_A")).toBe(true);
    const second = beginOrganizationTransition();
    expect(controller.signal.aborted).toBe(true);
    expect(isCurrentOrganizationRequest(first, "org_A")).toBe(false);
    expect(verifyOrganizationTransition(first, "org_A")).toBe(false);
    expect(verifyOrganizationTransition(second, "org_B")).toBe(true);
    expect(transitionSnapshot().organizationId).toBe("org_B");
    expect(isCurrentOrganizationRequest(first, "org_B")).toBe(false);
  });
});
