import { describe, expect, it } from "vitest";

import { GenerationStreamBuffer } from "./generation-stream-buffer";

describe("stream da geração atual", () => {
  it("ignora o replay anterior e aceita progressivamente só a nova redação", () => {
    const started = "2026-09-07T18:00:00.123Z";
    const buffer = new GenerationStreamBuffer(started);
    buffer.identify(String(Date.parse(started) - 1000));
    expect(buffer.append("␞")).toBeNull();
    expect(buffer.acceptsStage()).toBe(false);
    expect(buffer.append("Texto antigo")).toBeNull();
    buffer.identify(String(Date.parse(started)));
    expect(buffer.append("␞")).toBe("");
    expect(buffer.acceptsStage()).toBe(true);
    expect(buffer.append("Texto ")).toBe("Texto ");
    expect(buffer.append("novo")).toBe("Texto novo");
    // A retry of this run replaces its partial output, never concatenates it.
    buffer.identify(String(Date.parse(started)));
    expect(buffer.append("␞")).toBe("");
    expect(buffer.append("Nova tentativa")).toBe("Nova tentativa");
  });
  it("não mostra chunks sem identificação válida da geração", () => {
    const buffer = new GenerationStreamBuffer("invalid");
    buffer.identify("NaN");
    expect(buffer.append("␞")).toBeNull();
    expect(buffer.append("Texto")).toBeNull();
  });

  it("preserva a identidade com microssegundos e rejeita outra execução no mesmo segundo", () => {
    const buffer = new GenerationStreamBuffer("2026-09-09T12:10:56.662788Z");
    buffer.identify("1788955856000");
    expect(buffer.append("␞")).toBeNull();
    expect(buffer.acceptsStage()).toBe(false);
    buffer.identify("1788955856662");
    expect(buffer.acceptsStage()).toBe(false);
    expect(buffer.append("␞")).toBe("");
    expect(buffer.acceptsStage()).toBe(true);
    expect(buffer.append("## Manifestação\n\n")).toBe("## Manifestação\n\n");
    expect(buffer.append("Texto parcial")).toBe(
      "## Manifestação\n\nTexto parcial",
    );
  });
});
