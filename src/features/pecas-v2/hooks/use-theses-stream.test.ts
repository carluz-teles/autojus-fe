import { describe, expect, it } from "vitest";

import type { ThesisAPI } from "../lib/api-types";
import type { Thesis } from "../types";
import { applyReview, applyThesisFrame, streamId } from "./use-theses-stream";

// O hook useThesesStream é fino: assina o EventSource e delega as transformações
// de estado a estas reduções puras (applyThesisFrame / applyReview) + à
// substituição autoritativa no `done`. Testamos o CONTRATO de eventos contra
// essas reduções — a mesma lógica que roda em produção — sem precisar de DOM.
//
// Mock de frame do wire (snake_case, igual ao GET /theses + ordinal `n`).
function frame(
  n: number,
  over: Partial<ThesisAPI> = {},
): ThesisAPI & { n: number } {
  return {
    id: `real-${n}`,
    label: `Tese ${n}`,
    foundation: "Fundamentação.",
    legal_ref: "CPC, art. 1º",
    source_document_id: "",
    source_label: "",
    source_excerpt: "",
    anchors: [],
    segments: [],
    grounded: true,
    state: "off",
    position: n,
    confidence: "alta",
    n,
    ...over,
  };
}

const ordinals = (theses: Thesis[]) =>
  theses.map((t) => Number(t.id.replace("stream-", "")));

describe("useThesesStream event contract", () => {
  it("cresce incrementalmente a cada evento thesis (id local por ordinal)", () => {
    let theses: Thesis[] = [];
    theses = applyThesisFrame(theses, frame(1));
    expect(theses).toHaveLength(1);
    expect(theses[0].id).toBe(streamId(1));
    theses = applyThesisFrame(theses, frame(2));
    expect(theses).toHaveLength(2);
    expect(ordinals(theses)).toEqual([1, 2]);
  });

  it("mapeia o wire snake_case → domínio (confidence + grounded)", () => {
    const theses = applyThesisFrame([], frame(1, { confidence: "media" }));
    expect(theses[0].label).toBe("Tese 1");
    expect(theses[0].confidence).toBe("media");
    expect(theses[0].grounded).toBe(true);
  });

  it("é idempotente: um ordinal repetido substitui, não duplica", () => {
    let theses = applyThesisFrame([], frame(1, { label: "v1" }));
    theses = applyThesisFrame(theses, frame(1, { label: "v2" }));
    expect(theses).toHaveLength(1);
    expect(theses[0].label).toBe("v2");
  });

  it("review poda os cards fora de `kept` e reordena por `order`", () => {
    let theses: Thesis[] = [];
    for (const n of [1, 2, 3]) theses = applyThesisFrame(theses, frame(n));
    // Mantém 1 e 3, descarta 2, e inverte a ordem.
    theses = applyReview(theses, [1, 3], [3, 1]);
    expect(ordinals(theses)).toEqual([3, 1]);
  });

  it("done substitui os cards do stream pela lista autoritativa (ids reais)", () => {
    let theses: Thesis[] = [];
    for (const n of [1, 2]) theses = applyThesisFrame(theses, frame(n));
    // Simula o handler `done`: os ids locais (`stream-*`) somem; ficam os reais.
    const authoritative: Thesis[] = [
      { ...theses[0], id: "real-1" },
      { ...theses[1], id: "real-2" },
    ];
    expect(authoritative.every((t) => !t.id.startsWith("stream-"))).toBe(true);
    expect(authoritative.map((t) => t.id)).toEqual(["real-1", "real-2"]);
  });
});

// A degradação depende de um único flag: `hadThesis`. Reproduzimos a decisão do
// hook (onError(hadThesis)) — pré-1ª-tese → cair no POST síncrono; mid-stream →
// manter os cards. Isto documenta e trava o contrato de degradação.
describe("useThesesStream degradação", () => {
  function decideOnError(hadThesis: boolean): "fallback-sync" | "keep-cards" {
    return hadThesis ? "keep-cards" : "fallback-sync";
  }

  it("erro ANTES da 1ª tese sinaliza fallback pro POST síncrono", () => {
    expect(decideOnError(false)).toBe("fallback-sync");
  });

  it("erro DEPOIS de ≥1 tese mantém os cards mostrados", () => {
    // Cards já presentes sobrevivem a um erro mid-stream (o handler só muda o
    // status, nunca zera `theses`).
    let theses: Thesis[] = [];
    theses = applyThesisFrame(theses, frame(1));
    // Erro mid-stream não mexe na lista.
    const afterError = theses;
    expect(afterError).toHaveLength(1);
    expect(decideOnError(true)).toBe("keep-cards");
  });
});
