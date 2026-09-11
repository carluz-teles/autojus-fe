import { describe, expect, it } from "vitest";

import { concludeDemoAnalysis } from "./mock-transition";
import { createTriageDemo, filterTriage } from "./triage-data";

describe("triagem de alto volume no mock", () => {
  it("oferece 240 pendências com identificadores únicos e destinos preservados", () => {
    const items = createTriageDemo();
    expect(filterTriage(items, "", "", "")).toHaveLength(240);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(items.find((item) => item.id === "review")?.works).toHaveLength(2);
  });

  it("combina busca sem acentos, responsável e prazo", () => {
    const rows = filterTriage(
      createTriageDemo(),
      "manifestacao",
      "Luan Gomes",
      "unconfirmed",
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (item) =>
          item.owner === "Luan Gomes" &&
          item.due === "A confirmar" &&
          item.subject.includes("Manifestação"),
      ),
    ).toBe(true);
    expect(filterTriage(createTriageDemo(), "inexistente", "", "")).toEqual([]);
  });

  it("encaminha somente a seleção, sem duplicar, alterar prazos ou perder autoria", () => {
    const items = createTriageDemo();
    const ids = ["analysis", "triage-1", "triage-2"];
    const result = concludeDemoAnalysis(items, ids);
    expect(filterTriage(result, "", "", "")).toHaveLength(237);
    expect(result).toHaveLength(items.length);
    for (const id of ids) {
      const before = items.find((item) => item.id === id)!;
      const after = result.find((item) => item.id === id)!;
      expect(after.works).toHaveLength(1);
      expect(after.works[0].id).toBe(`${id}-plan`);
      expect(after.works[0].owner).toBe(before.owner);
      expect(after.due).toBe(before.due);
      expect(after.works[0].piece).toBeUndefined();
      expect(after.works[0].filing).toBeUndefined();
    }
    expect(concludeDemoAnalysis(result, ids)).toEqual(result);
    expect(concludeDemoAnalysis(items, [])).toEqual(items);
    expect(concludeDemoAnalysis(items, ["missing"])).toEqual(items);
  });
});
