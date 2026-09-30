// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  start: vi.fn(),
  put: vi.fn(),
  confirm: vi.fn(),
  detail: vi.fn(),
}));
vi.mock("@/lib/api/use-api", () => ({
  useApi: () => vi.fn(),
  usePresignedStorage: () => ({ put: mocks.put, getBlob: vi.fn() }),
}));
vi.mock("../../services/document-templates.service", () => ({
  createDocumentTemplate: mocks.create,
  startDocumentTemplateUpload: mocks.start,
  putDocumentTemplateBytes: mocks.put,
  confirmDocumentTemplateVersion: mocks.confirm,
  getDocumentTemplate: mocks.detail,
}));

import { useTemplateWizard } from "./use-template-wizard";

let wizard: ReturnType<typeof useTemplateWizard>;
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
const refresh = vi.fn().mockResolvedValue(undefined);

function Probe({ orgId }: { orgId: string }) {
  const current = useTemplateWizard(orgId, refresh);
  useEffect(() => {
    wizard = current;
  }, [current]);
  return null;
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe orgId="org_A" />
      </QueryClientProvider>,
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function chooseValidFile() {
  const file = new File(["bytes"], "modelo.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  wizard.chooseFile({
    target: { files: [file], value: "" },
  } as unknown as React.ChangeEvent<HTMLInputElement>);
  return file;
}

async function switchOrg(orgId: string) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe orgId={orgId} />
      </QueryClientProvider>,
    ),
  );
}

async function submit() {
  await act(async () => {
    wizard.submit({
      preventDefault() {},
      persist() {},
    } as unknown as React.FormEvent<HTMLFormElement>);
    await vi.waitFor(() => expect(wizard.isPending).toBe(false));
  });
}

describe("document template upload wizard", () => {
  it("closes and clears the draft when returning to a previous organization", async () => {
    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Rascunho do escritório A");
      chooseValidFile();
    });

    await switchOrg("org_B");
    await switchOrg("org_A");

    expect(wizard.isOpen).toBe(false);
    expect(wizard.form.getValues("name")).toBe("");
    expect(wizard.file).toBeNull();
    expect(wizard.step).toBe(1);
  });

  it("ignores a late create result after leaving the organization", async () => {
    let resolveCreate!: (value: { id: string }) => void;
    mocks.create.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Rascunho do escritório A");
      chooseValidFile();
    });
    await act(async () => {
      wizard.submit({
        preventDefault() {},
      } as React.FormEvent<HTMLFormElement>);
      await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    });

    await switchOrg("org_B");
    await switchOrg("org_A");
    await act(async () => resolveCreate({ id: "late-template" }));

    expect(wizard.isOpen).toBe(false);
    expect(wizard.createdTemplateId).toBeNull();
    expect(wizard.issue).toBeNull();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("creates once, uploads bytes and confirms before showing completion", async () => {
    const order: string[] = [];
    mocks.create.mockImplementation(async () => {
      order.push("create");
      return { id: "template-1" };
    });
    mocks.start.mockImplementation(async () => {
      order.push("start");
      return {
        version: { id: "version-1" },
        url: "https://storage.example/put",
      };
    });
    mocks.put.mockImplementation(async () => {
      order.push("put");
    });
    mocks.confirm.mockImplementation(async () => {
      order.push("confirm");
      return { id: "version-1", status: "READY", version_no: 1 };
    });

    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Modelo do escritório");
      chooseValidFile();
    });
    await submit();

    expect(order).toEqual(["create", "start", "put", "confirm"]);
    expect(wizard.step).toBe(2);
    expect(wizard.createdTemplateId).toBe("template-1");
    expect(refresh).toHaveBeenCalled();
  });

  it("checks the persisted version after an uncertain confirmation result", async () => {
    mocks.create.mockResolvedValue({ id: "template-1" });
    mocks.start.mockResolvedValue({
      version: { id: "version-1" },
      url: "https://storage.example/put",
    });
    mocks.put.mockResolvedValue(undefined);
    mocks.confirm.mockRejectedValue(new Error("connection lost"));
    mocks.detail.mockResolvedValue({
      versions: [{ id: "version-1", status: "READY", version_no: 1 }],
    });

    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Modelo do escritório");
      chooseValidFile();
    });
    await submit();

    expect(wizard.step).toBe(2);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.detail).toHaveBeenCalledOnce();
  });

  it("starts a new upload version after a signed PUT URL expires without recreating the model", async () => {
    mocks.create.mockResolvedValue({ id: "template-1" });
    mocks.start
      .mockResolvedValueOnce({
        version: { id: "version-1" },
        url: "https://storage.example/old",
      })
      .mockResolvedValueOnce({
        version: { id: "version-2" },
        url: "https://storage.example/new",
      });
    mocks.put
      .mockRejectedValueOnce(new ApiError("FORBIDDEN", "Expired", 403))
      .mockResolvedValueOnce(undefined);
    mocks.confirm.mockResolvedValue({
      id: "version-2",
      status: "READY",
      version_no: 2,
    });

    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Modelo do escritório");
      chooseValidFile();
    });
    await submit();
    expect(wizard.issue).toContain("expirou");
    await submit();

    expect(wizard.step).toBe(2);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.start).toHaveBeenCalledTimes(2);
    expect(mocks.confirm).toHaveBeenCalledOnce();
  });

  it("does not repeat create when its result is uncertain", async () => {
    mocks.create.mockRejectedValue(new Error("connection lost"));

    await act(async () => {
      wizard.openWizard();
      wizard.form.setValue("name", "Modelo do escritório");
      chooseValidFile();
    });
    await submit();
    expect(wizard.createUncertain).toBe(true);
    await submit();
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
