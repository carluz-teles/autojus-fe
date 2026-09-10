import { describe, expect, it } from "vitest";

import { demoJourneys, journeyStatus, openWorks } from "./demo-data";

const get = (id: string) => demoJourneys.find((journey) => journey.id === id)!;

describe("cenários da jornada demonstrativa", () => {
  it("mantém recebimento sem providências na triagem", () => {
    expect(journeyStatus(get("analysis"))).toBe("Na triagem");
    expect(get("analysis").works).toEqual([]);
  });

  it("não confunde existência de peça com conclusão da intimação", () => {
    const journey = get("review");
    expect(journey.works[0].piece?.version).toBe(3);
    expect(openWorks(journey)).toBe(2);
    expect(journey.works[1].blocker).toBeTruthy();
    expect(journeyStatus(journey)).toBe("Aguardando revisão");
  });

  it.each(["draft", "uncertain"])(
    "mantém %s aberto e sem protocolo confirmado",
    (id) => {
      expect(openWorks(get(id))).toBe(1);
      expect(get(id).works[0].filing).not.toBe("confirmed");
    },
  );

  it("representa conclusão sem exigir peça ou protocolo", () => {
    const journey = get("no-piece");
    expect(openWorks(journey)).toBe(0);
    expect(journeyStatus(journey)).toBe("Concluída sem peça");
    expect(journey.works[0].piece).toBeUndefined();
    expect(journey.works[0].filing).toBeUndefined();
  });

  it("identifica o desfecho confirmado e mantém autoria e histórico", () => {
    const journey = get("confirmed");
    expect(openWorks(journey)).toBe(0);
    expect(journeyStatus(journey)).toBe("Concluída · protocolo confirmado");
    expect(journey.works[0].piece?.author).toBeTruthy();
    expect(journey.works[0].events[0].actor).toBe("Luan Gomes");
  });
});
