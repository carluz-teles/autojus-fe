import { describe, expect, it } from "vitest";

import { DEMAND_KIND_LABEL, demandKindLabel } from "./demand-kind";

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
