// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { switchOrganization } = vi.hoisted(() => ({
  switchOrganization: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@clerk/nextjs", () => ({
  useOrganization: () => ({ organization: { id: "org-a", name: "Alpha" } }),
}));
vi.mock("./organization-coordinator", () => ({
  useOrganizationCoordinator: () => ({
    memberships: [
      { organization: { id: "org-a", name: "Alpha" } },
      { organization: { id: "org-b", name: "Beta" } },
    ],
    switching: false,
    switchOrganization,
  }),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

import { OrgSwitcher } from "./sidebar";

let root: Root;
let host: HTMLDivElement;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<OrgSwitcher collapsed={false} />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("OrgSwitcher", () => {
  it("exposes the active organization as a checked menu radio item", async () => {
    const trigger = host.querySelector<HTMLButtonElement>("button");
    expect(trigger).not.toBeNull();
    await act(async () => trigger?.click());

    const items = [...document.querySelectorAll('[role="menuitemradio"]')];
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
    ]);
    expect(switchOrganization).not.toHaveBeenCalled();
  });
});
