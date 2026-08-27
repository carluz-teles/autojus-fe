import { describe, expect, it } from "vitest";

import { remainingStepsLabel } from "../copy";
import { countDoneSteps, hasCurrentStep, resolveStepStatuses } from "./steps";

const ORDER = [
  "sources_connected",
  "members_invited",
  "first_triagem",
  "first_analise",
  "first_peca",
] as const;

describe("resolveStepStatuses", () => {
  it("marca o primeiro done=false como current e os anteriores como done", () => {
    const done = {
      sources_connected: true,
      members_invited: true,
      first_triagem: false,
      first_analise: false,
      first_peca: false,
    };

    const result = resolveStepStatuses([...ORDER], done);

    expect(result).toEqual([
      { id: "sources_connected", status: "done" },
      { id: "members_invited", status: "done" },
      { id: "first_triagem", status: "current" },
      { id: "first_analise", status: "future" },
      { id: "first_peca", status: "future" },
    ]);
  });

  it("com nenhum passo concluído, o primeiro é current e o resto é future", () => {
    const done = {
      sources_connected: false,
      members_invited: false,
      first_triagem: false,
      first_analise: false,
      first_peca: false,
    };

    const result = resolveStepStatuses([...ORDER], done);

    expect(result[0]).toEqual({ id: "sources_connected", status: "current" });
    expect(result.slice(1).every((s) => s.status === "future")).toBe(true);
  });

  it("quando todos concluídos, não há current (todos viram done)", () => {
    const done = {
      sources_connected: true,
      members_invited: true,
      first_triagem: true,
      first_analise: true,
      first_peca: true,
    };

    const result = resolveStepStatuses([...ORDER], done);

    expect(result.every((s) => s.status === "done")).toBe(true);
  });

  it("um passo concluído fora de ordem vira 'done' imediatamente (não fica preso ao current)", () => {
    // first_peca concluído fora de ordem, mas first_triagem ainda não — o
    // check aparece na hora; só o current (first_triagem) ganha CTA (ver
    // comentário em lib/steps.ts).
    const done = {
      sources_connected: true,
      members_invited: true,
      first_triagem: false,
      first_analise: false,
      first_peca: true,
    };

    const result = resolveStepStatuses([...ORDER], done);

    expect(result.find((s) => s.id === "first_triagem")).toEqual({
      id: "first_triagem",
      status: "current",
    });
    expect(result.find((s) => s.id === "first_analise")).toEqual({
      id: "first_analise",
      status: "future",
    });
    expect(result.find((s) => s.id === "first_peca")).toEqual({
      id: "first_peca",
      status: "done",
    });
  });
});

describe("hasCurrentStep", () => {
  it("false quando todos concluídos", () => {
    const done = {
      sources_connected: true,
      members_invited: true,
      first_triagem: true,
      first_analise: true,
      first_peca: true,
    };
    expect(hasCurrentStep([...ORDER], done)).toBe(false);
  });

  it("true quando ao menos um passo não concluído", () => {
    const done = {
      sources_connected: true,
      members_invited: false,
      first_triagem: false,
      first_analise: false,
      first_peca: false,
    };
    expect(hasCurrentStep([...ORDER], done)).toBe(true);
  });
});

describe("countDoneSteps", () => {
  it("conta booleanos true independente de posição", () => {
    const done = {
      sources_connected: true,
      members_invited: false,
      first_triagem: false,
      first_analise: false,
      first_peca: true,
    };
    expect(countDoneSteps([...ORDER], done)).toBe(2);
  });
});

describe("remainingStepsLabel", () => {
  it("singular para 1", () => {
    expect(remainingStepsLabel(1)).toBe("1 passo restante");
  });

  it("plural para 0 e >1", () => {
    expect(remainingStepsLabel(0)).toBe("0 passos restantes");
    expect(remainingStepsLabel(5)).toBe("5 passos restantes");
  });
});
