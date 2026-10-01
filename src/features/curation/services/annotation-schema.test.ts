import { describe, expect, it } from "vitest";

import fixtures from "../__tests__/intimation-label-v1.json";
import {
  annotationSchemaForTask,
  evidenceFromSelection,
} from "./annotation-schema";

describe("evidence uses frozen UTF-8 byte offsets", () => {
  it("converts accented text and emoji from browser UTF-16 selection", () => {
    const text = "réu 🧾: 15 dias úteis";
    const start = text.indexOf("15");
    expect(evidenceFromSelection(text, start, text.length)).toEqual({
      quote: "15 dias úteis",
      start: 11,
      end: 25,
    });
  });
  it("rejects split surrogates and empty or out-of-bounds selections", () => {
    expect(() => evidenceFromSelection("🧾 réu", 0, 1)).toThrow();
    expect(() => evidenceFromSelection("🧾 réu", 1, 2)).toThrow();
    expect(() => evidenceFromSelection("texto", 1, 1)).toThrow();
    expect(() => evidenceFromSelection("texto", 0, 9)).toThrow();
    expect(() => evidenceFromSelection("texto", -1, 2)).toThrow();
  });
});

describe("shared annotation contract", () => {
  for (const example of fixtures.cases) {
    it(example.name, () => {
      const schema = annotationSchemaForTask(
        fixtures.text,
        fixtures.cases[0].annotation.snapshot_digest,
        fixtures.contract,
      );
      expect(schema.safeParse(example.annotation).success).toBe(example.valid);
    });
  }
});
