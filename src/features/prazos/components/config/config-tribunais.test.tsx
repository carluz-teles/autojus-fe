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
  connect: vi.fn(),
  connectResult: undefined as unknown,
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
  useConnectCourtConnection: () => ({
    isPending: false,
    data: state.connectResult,
    error: null,
    reset: vi.fn(),
    mutateAsync: (id: string) => state.connect(id),
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
vi.mock("./conexao-wizard", () => ({
  ConexaoWizard: ({ court }: { court: string }) =>
    createElement("p", null, `wizard-2fa:${court}`),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.fail = false;
  state.connectResult = undefined;
  state.connect.mockReset();
  state.connect.mockResolvedValue({
    id: "one",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
    authentication_method: "CERTIFICATE_A1",
    created_at: "2026-09-25",
  });
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

// P0 de usabilidade: uma conexão caída (DISCONNECTED/ERROR/REAUTH_REQUIRED) só
// oferecia "Remover conexão". Remover e recriar pelo wizard pede o QR do 2FA de
// novo — e o QR é capturado UMA vez, pode não existir mais. O BE já reusa o seed
// salvo em POST /:id/connect; a linha da conexão precisa expor isso.
it("oferece Reconectar na conexão caída e reusa o connect em vez de remover/recriar", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = async () =>
    act(async () => root.render(createElement(ConfigTribunais)));
  await render();

  const reconectar = document.querySelector(
    'button[aria-label="Reconectar conexão TJSP · eproc"]',
  );
  expect(reconectar).not.toBeNull();
  await act(async () => (reconectar as HTMLElement).click());
  expect(state.connect).toHaveBeenCalledWith("one");
  // Reconectar NÃO é remover: a conexão continua na lista.
  expect(state.remove).not.toHaveBeenCalled();
  expect(
    document.querySelector('button[aria-label="Remover conexão TJSP · eproc"]'),
  ).not.toBeNull();
  await act(async () => root.unmount());
  container.remove();
});

it("mostra o erro que o BE devolveu quando a reconexão falha", async () => {
  state.connectResult = {
    id: "one",
    court: "TJSP",
    system: "EPROC",
    status: "ERROR",
    authentication_method: "CERTIFICATE_A1",
    created_at: "2026-09-25",
    error: "certificado expirado no portal",
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(ConfigTribunais)));
  expect(document.body.textContent).toContain("certificado expirado no portal");
  await act(async () => root.unmount());
  container.remove();
});

it("confirma a reconexão em voz alta quando o tribunal aceita", async () => {
  state.connectResult = {
    id: "one",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
    authentication_method: "CERTIFICATE_A1",
    created_at: "2026-09-25",
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(ConfigTribunais)));
  expect(document.body.textContent).toContain("Conexão restabelecida");
  await act(async () => root.unmount());
  container.remove();
});

// Falta o segundo fator = não há seed pra reusar: aí sim o caminho é o fluxo do QR,
// e o connect não é chamado à toa.
it("cai no fluxo do QR quando falta o segundo fator, sem chamar o connect", async () => {
  state.connections = [
    {
      id: "one",
      court: "TJSP",
      system: "EPROC",
      status: "MFA_ENROLLMENT_REQUIRED",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
  ];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(ConfigTribunais)));
  const reconectar = document.querySelector(
    'button[aria-label="Reconectar conexão TJSP · eproc"]',
  );
  expect(reconectar).not.toBeNull();
  await act(async () => (reconectar as HTMLElement).click());
  expect(state.connect).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("wizard-2fa:TJSP");
  await act(async () => root.unmount());
  container.remove();
});

it("conexão saudável não oferece Reconectar", async () => {
  state.connections = [
    {
      id: "one",
      court: "TJSP",
      system: "EPROC",
      status: "CONNECTED",
      authentication_method: "CERTIFICATE_A1",
      created_at: "2026-09-25",
    },
  ];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(ConfigTribunais)));
  expect(
    document.querySelector(
      'button[aria-label="Reconectar conexão TJSP · eproc"]',
    ),
  ).toBeNull();
  await act(async () => root.unmount());
  container.remove();
});
