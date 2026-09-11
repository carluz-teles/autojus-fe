import { describe, expect, it } from "vitest";

import { demoJourneys } from "./demo-data";
import { concludeDemoAnalysis } from "./mock-transition";

describe("transição de triagem apenas no mock", () => {
  it("retira da triagem sem remover do acervo, com uma providência vinculada", () => {
    const result = concludeDemoAnalysis(demoJourneys);
    expect(result).toHaveLength(demoJourneys.length);
    expect(result.filter((item) => !item.works.length)).toHaveLength(0);
    const item = result.find((entry) => entry.id === "analysis")!;
    expect(item.works).toHaveLength(1);
    expect(item.works[0].id).toBe("analysis-plan");
    expect(item.works[0].owner).toBe("Marina Costa");
    expect(item.works[0].stage).toBe("work");
    expect(item.due).toBe("A confirmar");
    expect(item.works[0].piece).toBeUndefined();
    expect(item.works[0].filing).toBeUndefined();
  });

  it("não duplica trabalho se a ação for repetida", () => {
    const once = concludeDemoAnalysis(demoJourneys);
    expect(concludeDemoAnalysis(once)).toEqual(once);
  });

  it("preserva fixtures e cenários não relacionados", () => {
    const result = concludeDemoAnalysis(demoJourneys);
    expect(
      demoJourneys.find((item) => item.id === "analysis")!.works,
    ).toHaveLength(0);
    expect(result[0]).toBe(demoJourneys[0]);
  });
});
