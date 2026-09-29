// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

const { getToken, apiFetch } = vi.hoisted(() => ({
  getToken: vi.fn(),
  apiFetch: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org_A", getToken }),
}));
vi.mock("./client", () => ({ apiFetch, apiFetchBlob: vi.fn() }));

import { useApi } from "./use-api";

let request: ReturnType<typeof useApi>;
let root: Root;
let host: HTMLDivElement;
function Probe() {
  const api = useApi();
  useEffect(() => {
    request = api;
  }, [api]);
  return null;
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const generation = beginOrganizationTransition();
  verifyOrganizationTransition(generation, "org_A");
  getToken.mockResolvedValue("token-A");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Probe />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("organization bound API requests", () => {
  it("does not let an old closure acquire credentials after a switch", async () => {
    const oldRequest = request;
    const generation = beginOrganizationTransition();
    verifyOrganizationTransition(generation, "org_B");
    await expect(oldRequest("/v1/processos")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(getToken).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects a late response and requests the captured organization token", async () => {
    const oldRequest = request;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    apiFetch.mockImplementation(async (_path, req) => {
      const token = await req.getToken();
      await pending;
      return { token };
    });
    const result = oldRequest("/v1/processos");
    await vi.waitFor(() =>
      expect(getToken).toHaveBeenCalledWith({ organizationId: "org_A" }),
    );
    const generation = beginOrganizationTransition();
    verifyOrganizationTransition(generation, "org_B");
    release();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});
