import { describe, expect, it } from "vitest";

import {
  DEMAND_KIND_LABEL,
  DEMAND_TARGET_ROLE_LABEL,
  demandKindLabel,
  demandTargetRoleLabel,
} from "./demand-kind";

describe("DEMAND_KIND_LABEL", () => {
  it("cobre exatamente os 20 valores do BE (migrations/0182), verbatim", () => {
    expect(DEMAND_KIND_LABEL).toEqual({
      answer: "resposta/contestação",
      reply: "réplica",
      appeal: "recurso de apelação",
      interlocutory_appeal: "agravo de instrumento",
      clarification_motion: "embargos de declaração",
      small_claims_appeal: "recurso inominado",
      counter_arguments: "contrarrazões",
      execution_objection: "embargos à execução",
      enforcement_challenge: "impugnação ao cumprimento de sentença",
      manifest: "manifestação",
      provide_address: "informar endereço",
      provide_document: "juntar documento",
      provide_calculation: "apresentar cálculos",
      pay: "efetuar pagamento",
      comply: "cumprimento de decisão",
      attend_hearing: "comparecer à audiência",
      appoint_counsel: "constituir advogado",
      acknowledge: "ciência",
      none: "nenhuma providência",
      undetermined: "indeterminado",
    });
  });
});

describe("demandKindLabel", () => {
  it("rotula um demand_kind conhecido", () => {
    expect(demandKindLabel("answer")).toBe("resposta/contestação");
    expect(demandKindLabel("acknowledge")).toBe("ciência");
  });

  it("devolve '' quando não há brief ainda", () => {
    expect(demandKindLabel("")).toBe("");
  });
});

describe("demandTargetRoleLabel", () => {
  it("rotula os papéis determinados como FRASE (quem deve agir), não substantivo", () => {
    expect(demandTargetRoleLabel("PLAINTIFF")).toBe("Cabe ao autor");
    expect(demandTargetRoleLabel("DEFENDANT")).toBe("Cabe ao réu");
    expect(demandTargetRoleLabel("BOTH")).toBe("Cabe a ambas as partes");
    expect(demandTargetRoleLabel("COUNSEL")).toBe("Cabe ao advogado");
  });

  it("UNKNOWN e ausência são a MESMA coisa pra UI: '' (nunca um selo de ignorância)", () => {
    expect(demandTargetRoleLabel("UNKNOWN")).toBe("");
    expect(demandTargetRoleLabel(null)).toBe("");
  });

  it("o mapa cobre exatamente os 4 papéis determinados do CHECK da migration 0182", () => {
    expect(Object.keys(DEMAND_TARGET_ROLE_LABEL).sort()).toEqual([
      "BOTH",
      "COUNSEL",
      "DEFENDANT",
      "PLAINTIFF",
    ]);
  });
});
