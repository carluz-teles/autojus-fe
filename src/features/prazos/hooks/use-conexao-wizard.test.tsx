// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "@/features/configuracoes/types/court-connection";

import { useConexaoWizard } from "./use-conexao-wizard";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("@/features/configuracoes/hooks/use-cert-upload", () => ({
  useCertificados: () => ({
    data: [
      {
        id: "cert-1",
        not_before: "2020-01-01",
        not_after: "2100-01-01",
        revoked_at: null,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/features/configuracoes/hooks/use-court-connections", () => ({
  useCreateCourtConnection: () => ({ mutateAsync: mocks.create }),
  useConnectCourtConnection: () => ({ mutateAsync: mocks.connect }),
  useSubmitMfaSeed: () => ({ mutateAsync: vi.fn() }),
  useSubmitMfaCode: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("@/features/configuracoes/services/court-connections.service", () => ({
  syncCourtAutos: vi.fn(),
}));

const entry: CourtCatalogEntry = {
  court: "TJSP",
  name: "São Paulo",
  system: "EPROC",
  available: true,
  source_url: "",
  connection_mode: "PERSISTENT",
  second_factor: "TOTP_APP",
};
let latest: ReturnType<typeof useConexaoWizard>;
let existing: CourtConnectionView[] = [];
function Probe() {
  const wizard = useConexaoWizard({
    court: "TJSP",
    entries: [entry],
    connections: existing,
  });
  useEffect(() => {
    latest = wizard;
  });
  return null;
}

describe("useConexaoWizard retry", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.create.mockReset();
    mocks.connect.mockReset();
    existing = [];
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render() {
    await act(async () => root.render(createElement(Probe)));
  }

  it("retries the created ID after connect HTTP failure without creating again", async () => {
    mocks.create.mockResolvedValue({
      id: "created-id",
      status: "DISCONNECTED",
    });
    mocks.connect
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ id: "created-id", status: "CONNECTED" });
    await render();
    await act(async () => {
      await latest.conectar();
    });
    expect(latest.sistemas[0].connectionId).toBe("created-id");
    expect(latest.sistemas[0].fase).toBe("erro");
    await act(async () => {
      latest.reconectar("EPROC");
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.connect).toHaveBeenNthCalledWith(2, "created-id");
    expect(latest.sistemas[0].fase).toBe("conectado");
  });

  it.each(["ERROR", "MFA_REQUIRED"] as const)(
    "uses the existing %s connection instead of creating a duplicate",
    async (status) => {
      existing = [
        {
          id: "existing-id",
          court: "TJSP",
          system: "EPROC",
          status,
          authentication_method: "CERTIFICATE_A1",
          created_at: "2026-09-25",
        },
      ];
      mocks.connect.mockResolvedValue({ ...existing[0], status: "ERROR" });
      await render();
      expect(latest.passo).toBe("conectar");
      await act(async () => {
        latest.reconectar("EPROC");
      });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.connect).toHaveBeenCalledWith("existing-id");
      expect(latest.sistemas[0].fase).toBe("erro");
    },
  );

  it("ignores a late connect result after the wizard unmounts", async () => {
    let resolve!: (value: CourtConnectionView) => void;
    existing = [
      {
        id: "existing-id",
        court: "TJSP",
        system: "EPROC",
        status: "ERROR",
        authentication_method: "CERTIFICATE_A1",
        created_at: "2026-09-25",
      },
    ];
    mocks.connect.mockReturnValue(
      new Promise<CourtConnectionView>((r) => {
        resolve = r;
      }),
    );
    await render();
    await act(async () => {
      latest.reconectar("EPROC");
    });
    await act(async () => root.unmount());
    await act(async () => resolve({ ...existing[0], status: "CONNECTED" }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
