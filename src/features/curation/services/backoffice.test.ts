import { describe, expect, it, vi } from "vitest";

import {
  type BackofficeSession,
  getBackofficeSession,
  sessionMatchesOrganization,
} from "./backoffice";

const session: BackofficeSession = {
  organization_id: "org_internal",
  tenant_id: "tenant-internal",
  user_id: "operator",
  revision: 1,
  capabilities: ["curation.read"],
  requires_organization_switch: false,
};

describe("internal session", () => {
  it("never sends user or tenant authority from the browser", async () => {
    const api = vi.fn().mockResolvedValue({ data: session });
    const signal = new AbortController().signal;
    expect(await getBackofficeSession(api, signal)).toEqual(session);
    expect(api).toHaveBeenCalledWith("/v1/backoffice/session", { signal });
  });

  it("requires matching organization and current capabilities", () => {
    expect(sessionMatchesOrganization(session, "org_internal")).toBe(true);
    expect(sessionMatchesOrganization(session, "org_customer")).toBe(false);
    expect(sessionMatchesOrganization(session, null)).toBe(false);
    expect(sessionMatchesOrganization(undefined, "org_internal")).toBe(false);
    expect(
      sessionMatchesOrganization(
        { ...session, capabilities: [] },
        "org_internal",
      ),
    ).toBe(false);
    expect(
      sessionMatchesOrganization(
        { ...session, requires_organization_switch: true },
        "org_internal",
      ),
    ).toBe(false);
  });
});
