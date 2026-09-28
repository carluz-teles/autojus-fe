// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ConfigTribunais } from "./config-tribunais";

const state = vi.hoisted(() => ({
  connections: [
    {
      id: "one",
      court: "TJSP",
      system: "EPROC",
      status: "ERROR",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
    {
      id: "two",
      court: "TJSP",
      system: "ESAJ",
      status: "DISCONNECTED",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
  ],
  fail: false,
  remove: vi.fn(),
}));
vi.mock("@/features/configuracoes/hooks/use-court-connections", () => ({
  useCourtCatalog: () => ({
    data: {
      data: [
        {
          court: "TJSP",
          name: "São Paulo",
          system: "EPROC",
          available: true,
          connection_mode: "PERSISTENT",
          capabilities: ["SYNC_AUTOS"],
        },
        {
          court: "TJSP",
          name: "São Paulo",
          system: "ESAJ",
          available: true,
          connection_mode: "PER_OPERATION",
          capabilities: ["PREPARE_FILING"],
        },
      ],
    },
    isPending: false,
    isError: false,
  }),
  useCourtConnections: () => ({
    data: state.connections,
    isPending: false,
    isError: false,
  }),
  useDeleteCourtConnection: () => ({
    isPending: false,
    isError: state.fail,
    reset: vi.fn(),
    mutate: (id: string, options: { onSuccess: () => void }) =>
      state.remove(id, options),
  }),
}));
vi.mock("@/features/configuracoes/hooks/use-test-court-connection", () => ({
  useTestCourtConnection: () => ({
    isPending: false,
    isError: false,
    data: undefined,
    mutate: vi.fn(),
  }),
}));
vi.mock("../../hooks/use-cert-wizard", () => ({
  useCertWizard: () => ({
    lista: [],
    listaPendente: false,
    listaErro: false,
    abrir: vi.fn(),
  }),
}));
vi.mock("./cert-wizard", () => ({ CertWizard: () => null }));
vi.mock("./conexao-wizard", () => ({ ConexaoWizard: () => null }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.fail = false;
  state.connections = [
    {
      id: "one",
      court: "TJSP",
      system: "EPROC",
      status: "ERROR",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
    {
      id: "two",
      court: "TJSP",
      system: "ESAJ",
      status: "DISCONNECTED",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
  ];
});

it("cancels without DELETE, retains failure, then removes only the selected system", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = async () =>
    act(async () => root.render(createElement(ConfigTribunais)));
  const click = async (element: Element | null) => {
    expect(element).not.toBeNull();
    await act(async () => (element as HTMLElement).click());
  };
  const removeOne = () =>
    document.querySelector('button[aria-label="Remover conexão TJSP · eproc"]');
  await render();
  await click(removeOne());
  expect(document.body.textContent).toContain(
    "Os processos e documentos já importados e o certificado serão mantidos.",
  );
  await click(
    [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Cancelar",
    ) ?? null,
  );
  expect(state.remove).not.toHaveBeenCalled();

  await click(removeOne());
  state.remove.mockImplementationOnce(() => {
    state.fail = true;
  });
  await click(
    [...document.querySelectorAll("button")].find(
      (button) =>
        button.textContent === "Remover conexão" &&
        !button.getAttribute("aria-label"),
    ) ?? null,
  );
  await render();
  expect(document.body.textContent).toContain(
    "Não foi possível remover a conexão.",
  );
  expect(removeOne()).not.toBeNull();

  state.remove.mockImplementationOnce((id, options) => {
    state.connections = state.connections.filter(
      (connection) => connection.id !== id,
    );
    options.onSuccess();
  });
  await click(
    [...document.querySelectorAll("button")].find(
      (button) =>
        button.textContent === "Remover conexão" &&
        !button.getAttribute("aria-label"),
    ) ?? null,
  );
  await render();
  expect(state.remove).toHaveBeenNthCalledWith(1, "one", expect.any(Object));
  expect(state.remove).toHaveBeenNthCalledWith(2, "one", expect.any(Object));
  expect(removeOne()).toBeNull();
  expect(
    document.querySelector('button[aria-label="Remover conexão TJSP · e-SAJ"]'),
  ).not.toBeNull();
  await act(async () => root.unmount());
});
