// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

const { getToken, apiPutPresigned, apiGetPresignedBlob } = vi.hoisted(() => ({
  getToken: vi.fn(),
  apiPutPresigned: vi.fn(),
  apiGetPresignedBlob: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ orgId: "org_A", getToken }),
}));
vi.mock("./client", () => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
  apiPutPresigned,
  apiGetPresignedBlob,
}));

import { usePresignedStorage } from "./use-api";

let storage: ReturnType<typeof usePresignedStorage>;
let root: Root;
let host: HTMLDivElement;
function Probe() {
  const value = usePresignedStorage();
  useEffect(() => {
    storage = value;
  }, [value]);
  return null;
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const generation = beginOrganizationTransition();
  verifyOrganizationTransition(generation, "org_A");
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

describe("organization-bound presigned storage", () => {
  it("never requests a Clerk token for a signed download", async () => {
    apiGetPresignedBlob.mockResolvedValue(new Blob(["pdf"]));
    await expect(
      storage.getBlob("https://storage.example/pdf"),
    ).resolves.toBeInstanceOf(Blob);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("aborts an in-flight upload when the organization changes", async () => {
    apiPutPresigned.mockImplementation(
      (_url, _file, signal: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const pending = storage.put(
      "https://storage.example/put",
      new Blob(["docx"]),
    );
    await vi.waitFor(() => expect(apiPutPresigned).toHaveBeenCalledOnce());
    const generation = beginOrganizationTransition();
    verifyOrganizationTransition(generation, "org_B");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(getToken).not.toHaveBeenCalled();
  });
});
