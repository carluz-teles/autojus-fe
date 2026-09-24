// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import { useCapturaBoundedRefetch } from "./use-captura-bounded-refetch";

// S2 (docs/qa-remediation-evidence/fe-operations-architecture.md): prova, com
// React real (createRoot+act, mesmo padrão de use-construction.test.tsx), as
// 3 propriedades que a mesma-interval por si não garante: ativação, refetch
// FINAL único na transição terminal, e o teto de duração (stall guard) que
// desliga o poll mesmo com `active` ainda `true`.

let latest: ReturnType<typeof useCapturaBoundedRefetch>;
let onTerminal: Mock<() => void>;
let activeProp = false;
let intervalMs = 4_000;
let maxDurationMs = 10_000;

function Probe() {
  const value = useCapturaBoundedRefetch(
    activeProp,
    intervalMs,
    maxDurationMs,
    onTerminal,
  );
  useEffect(() => {
    latest = value;
  });
  return null;
}

describe("useCapturaBoundedRefetch", () => {
  let root: Root;
  let container: HTMLDivElement;

  async function render() {
    await act(async () => root.render(createElement(Probe)));
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    onTerminal = vi.fn<() => void>();
    activeProp = false;
    intervalMs = 4_000;
    maxDurationMs = 10_000;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("inativo desde o início: pollIntervalMs=false, onTerminal NUNCA chamado (não é uma transição)", async () => {
    await render();
    expect(latest.pollIntervalMs).toBe(false);
    expect(onTerminal).not.toHaveBeenCalled();
  });

  it("ativa: pollIntervalMs vira o intervalo real enquanto a captura está em andamento", async () => {
    activeProp = true;
    await render();
    expect(latest.pollIntervalMs).toBe(4_000);
    expect(latest.stalled).toBe(false);
  });

  it("transição running→terminal: onTerminal chamado EXATAMENTE UMA VEZ, poll desliga", async () => {
    activeProp = true;
    await render();
    expect(latest.pollIntervalMs).toBe(4_000);

    activeProp = false;
    await render();
    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(latest.pollIntervalMs).toBe(false);

    // re-render sem mudar `active` de novo — não é uma NOVA transição.
    await render();
    expect(onTerminal).toHaveBeenCalledTimes(1);
  });

  it("teto de duração (stall guard): active continua true além do maxDurationMs → poll desliga sozinho", async () => {
    maxDurationMs = 10_000;
    activeProp = true;
    await render();
    expect(latest.pollIntervalMs).toBe(4_000);

    await act(async () => {
      vi.advanceTimersByTime(9_999);
    });
    expect(latest.stalled).toBe(false);
    expect(latest.pollIntervalMs).toBe(4_000);

    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    expect(latest.stalled).toBe(true);
    expect(latest.pollIntervalMs).toBe(false);
    // stall NÃO é a mesma coisa que terminal real — onTerminal não dispara
    // só porque o teto bateu (a captura pode continuar rodando de verdade).
    expect(onTerminal).not.toHaveBeenCalled();
  });

  it("desativar ANTES do teto limpa o timer (sem stall tardio vazando pro próximo ciclo)", async () => {
    maxDurationMs = 10_000;
    activeProp = true;
    await render();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    activeProp = false;
    await render();
    expect(latest.stalled).toBe(false);

    // avança bem além do teto original — nada deve disparar (timer já foi limpo).
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(latest.stalled).toBe(false);
    expect(onTerminal).toHaveBeenCalledTimes(1); // só a transição real, não o stall
  });

  it("reativar depois de um stall começa um teto NOVO (não herda o estouro anterior)", async () => {
    maxDurationMs = 5_000;
    activeProp = true;
    await render();
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(latest.stalled).toBe(true);

    activeProp = false;
    await render();
    activeProp = true;
    await render();
    expect(latest.stalled).toBe(false);
    expect(latest.pollIntervalMs).toBe(4_000);
  });

  it("unmount durante o poll ativo não deixa timer pendente disparando depois (sem erro)", async () => {
    activeProp = true;
    await render();
    await act(async () => root.unmount());
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
  });
});
