// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import type { CourtConnectionView } from "../types/court-connection";
import { COURT_CONNECTIONS_QUERY_KEY } from "./use-court-connections";
import { useReconnectCourtConnection } from "./use-reconnect-court-connection";

const connect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../services/court-connections.service", () => ({
  connectCourtConnection: connect,
}));

const desconectada = {
  id: "one",
  court: "TJSP",
  system: "EPROC",
  authentication_method: "CERTIFICATE_A1",
  status: "DISCONNECTED",
  created_at: "2026-09-25",
} as CourtConnectionView;

const segundoFator = vi.fn();
let latest: ReturnType<typeof useReconnectCourtConnection>;
function Probe() {
  const hook = useReconnectCourtConnection({
    onSegundoFator: segundoFator,
  });
  useEffect(() => {
    latest = hook;
  });
  return null;
}

// Desmonta SEMPRE, inclusive quando a asserção falha no meio: um Probe vazado
// continua escrevendo em `latest` e contamina o teste seguinte.
const montados: (() => Promise<void>)[] = [];

// O TanStack Query notifica os observers num tick POSTERIOR (notifyManager), então o
// re-render com o resultado da mutação pode cair depois do act. Drena antes de ler o
// estado derivado do hook — sem isso o teste é flaky.
async function drenar() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function montar(client: QueryClient) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    ),
  );
  const desmontar = async () => {
    await act(async () => root.unmount());
    container.remove();
    client.clear();
  };
  montados.push(desmontar);
  return desmontar;
}

afterEach(async () => {
  for (const desmontar of montados.splice(0)) await desmontar();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

// O beco sem saída de produção: uma conexão DISCONNECTED só oferecia "Remover
// conexão", e recriar pelo wizard pede o QR do 2FA de novo (capturado UMA vez —
// pode não existir mais). O reconectar reusa o seed já selado no BE
// (POST /v1/court-connections/:id/connect).
it("reconecta reusando o connect do BE, sem passar por remover/recriar", async () => {
  const client = new QueryClient();
  client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [desconectada]);
  connect.mockResolvedValue({ ...desconectada, status: "CONNECTED" });
  const desmontar = await montar(client);

  await act(async () => latest.reconectar(desconectada));
  await drenar();

  expect(connect).toHaveBeenCalledTimes(1);
  expect(connect.mock.calls[0][1]).toBe("one");
  expect(client.getQueryData(COURT_CONNECTIONS_QUERY_KEY)).toEqual([
    { ...desconectada, status: "CONNECTED" },
  ]);
  expect(latest.conectada).toBe(true);
  expect(latest.erro).toBeNull();
  expect(segundoFator).not.toHaveBeenCalled();
  await desmontar();
});

// O connect responde 200 COM o estado resultante mesmo quando falha (ver
// internal/court/handler.go connect) — a mensagem do BE é o que o usuário precisa ler.
it("mostra o erro que o BE devolve quando o portal recusa a autenticação", async () => {
  const client = new QueryClient();
  client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [desconectada]);
  connect.mockResolvedValue({
    ...desconectada,
    status: "ERROR",
    error: "certificado expirado no portal",
  });
  const desmontar = await montar(client);

  await act(async () => latest.reconectar(desconectada));
  await drenar();

  expect(latest.conectada).toBe(false);
  expect(latest.erro).toBe("certificado expirado no portal");
  expect(segundoFator).not.toHaveBeenCalled();
  await desmontar();
});

// MFA_ENROLLMENT_REQUIRED não é erro: é "falta capturar o segundo fator". Aí sim o
// fluxo do QR é o caminho — e não há seed pra reusar, então nem tenta o connect.
it("cai no fluxo do segundo fator sem bater no connect quando falta o 2FA", async () => {
  const client = new QueryClient();
  const semSeed = {
    ...desconectada,
    status: "MFA_ENROLLMENT_REQUIRED",
  } as CourtConnectionView;
  client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [semSeed]);
  const desmontar = await montar(client);

  await act(async () => latest.reconectar(semSeed));
  await drenar();

  expect(connect).not.toHaveBeenCalled();
  expect(segundoFator).toHaveBeenCalledWith(semSeed);
  await desmontar();
});

it("cai no fluxo do segundo fator quando o connect descobre que o seed não serve", async () => {
  const client = new QueryClient();
  client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [desconectada]);
  connect.mockResolvedValue({
    ...desconectada,
    status: "MFA_ENROLLMENT_REQUIRED",
  });
  const desmontar = await montar(client);

  await act(async () => latest.reconectar(desconectada));
  await drenar();

  expect(connect).toHaveBeenCalledTimes(1);
  expect(segundoFator).toHaveBeenCalledWith({
    ...desconectada,
    status: "MFA_ENROLLMENT_REQUIRED",
  });
  expect(latest.conectada).toBe(false);
  await desmontar();
});

// AUTHENTICATING é estado de espera, não conclusão: a lista já repolla nele
// (useCourtConnections), então o hook não pode declarar sucesso.
it("não declara sucesso enquanto a autenticação está em curso", async () => {
  const client = new QueryClient();
  client.setQueryData(COURT_CONNECTIONS_QUERY_KEY, [desconectada]);
  connect.mockResolvedValue({ ...desconectada, status: "AUTHENTICATING" });
  const desmontar = await montar(client);

  await act(async () => latest.reconectar(desconectada));
  await drenar();

  expect(latest.conectada).toBe(false);
  expect(latest.erro).toBeNull();
  expect(latest.autenticando).toBe(true);
  await desmontar();
});
