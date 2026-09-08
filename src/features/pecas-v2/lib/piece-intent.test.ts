import { describe, expect, it } from "vitest";

import type { IntimacaoRecipient } from "@/features/intimacoes/types";
import type { PartesView } from "@/features/processos/types";

import { representedParty } from "./piece-intent";

const recipients: IntimacaoRecipient[] = [
  { name: "Advogado", oab_number: "00123", oab_uf: "SP", matched: true },
];
const party = {
  name: "Empresa cliente",
  document: null,
  counsels: [{ name: "Advogado", oab: "123", uf: "SP" }],
};
const parties: PartesView = {
  autor: [party],
  reu: [{ name: "Parte contrária", document: null, counsels: [] }],
  terceiros: [],
};
describe("represented party", () => {
  it("prefills the party linked to monitored counsel, not the publication recipient", () => {
    expect(representedParty(parties, recipients)).toEqual({
      name: "Empresa cliente",
      role: "Autor / Exequente",
    });
  });
  it("requires a choice when multiple parties share counsel", () => {
    expect(
      representedParty(
        { ...parties, terceiros: [{ ...party, name: "Outra parte" }] },
        recipients,
      ),
    ).toBeNull();
  });
  it("does not assume a client from the party role or a counsel in another state", () => {
    expect(representedParty(parties, [])).toBeNull();
    expect(
      representedParty(parties, [{ ...recipients[0], oab_uf: "RJ" }]),
    ).toBeNull();
  });
});
