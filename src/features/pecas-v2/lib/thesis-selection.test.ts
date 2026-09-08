import { describe, expect, it } from "vitest";

import type { Thesis } from "../types";
import { thesisSelection, toggleThesisSelection } from "./thesis-selection";

const theses = [
  { id: "existing", state: "included" },
  { id: "first", state: "off" },
  { id: "second", state: "off" },
] as Thesis[];

describe("seleção de teses em lote", () => {
  it("combina adições e remoções sem modificar as teses persistidas", () => {
    let choices = toggleThesisSelection(theses[0], {});
    choices = toggleThesisSelection(theses[1], choices);
    choices = toggleThesisSelection(theses[2], choices);
    expect(thesisSelection(theses, choices)).toEqual({
      ids: ["first", "second"],
      added: 2,
      removed: 1,
      changeCount: 3,
    });
    expect(theses[0].state).toBe("included");
  });
  it("desfazer uma escolha elimina a alteração pendente", () => {
    const choices = toggleThesisSelection(
      theses[1],
      toggleThesisSelection(theses[1], {}),
    );
    expect(choices).toEqual({});
    expect(thesisSelection(theses, choices).changeCount).toBe(0);
  });
  it("preserva escolhas quando novos autos trazem sugestões e ignora IDs removidos", () => {
    const list = [...theses, { id: "new", state: "off" }] as Thesis[];
    expect(thesisSelection(list, { first: true, deleted: true }).ids).toEqual([
      "existing",
      "first",
    ]);
    expect(
      thesisSelection(list, { first: true, deleted: true }).changeCount,
    ).toBe(1);
  });
  it("permite remover todas sem reintroduzir a seleção antiga", () => {
    expect(thesisSelection(theses, { existing: false }).ids).toEqual([]);
  });
});
