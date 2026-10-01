// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

const { getToken, apiFetch, apiFetchBinary } = vi.hoisted(() => ({
  getToken: vi.fn(),
  apiFetch: vi.fn(),
  apiFetchBinary: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org_A", getToken }),
}));
vi.mock("./client", () => ({
  apiFetch,
  apiFetchBlob: vi.fn(),
  apiFetchBinary,
}));

import { useApi, useApiBinary } from "./use-api";

let request: ReturnType<typeof useApi>;
let binary: ReturnType<typeof useApiBinary>;
let root: Root;
let host: HTMLDivElement;
function Probe() {
  const api = useApi();
  const bytes = useApiBinary();
  useEffect(() => {
    request = api;
    binary = bytes;
  }, [api, bytes]);
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
  it("discovers internal access before organization verification and rejects a late discovery", async () => {
    await act(async () => {
      beginOrganizationTransition();
    });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    apiFetch.mockImplementation(async (_path, req) => {
      await req.getToken();
      await pending;
      return { data: { organization_id: "org_A" } };
    });
    const result = request("/v1/backoffice/session");
    await vi.waitFor(() => expect(getToken).toHaveBeenCalled());
    await act(async () => {
      beginOrganizationTransition();
    });
    release();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

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

it("rejects late private binary content when the organization changes", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  apiFetchBinary.mockImplementation(async (_path, req) => {
    await req.getToken();
    await gate;
    return { blob: new Blob(["private"]), headers: {} };
  });
  const response = binary("/v1/curation/dataset-releases/id/downloads", {
    method: "POST",
    body: { request_id: "r" },
    maxBytes: 10,
    expectedContentType: "application/zip",
  });
  await vi.waitFor(() => expect(getToken).toHaveBeenCalled());
  await act(async () => {
    beginOrganizationTransition();
  });
  release();
  await expect(response).rejects.toMatchObject({ name: "AbortError" });
});
