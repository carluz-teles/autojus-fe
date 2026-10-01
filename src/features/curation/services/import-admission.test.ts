import { describe, expect, it } from "vitest";

import { evidenceFromSelection } from "./annotation-schema";
import { redactionPreview } from "./import-admission";

describe("sanitization preview", () => {
  it("preserves unselected bytes and works with UTF-8 accents", () => {
    const text = "Intime-se João da Silva em 15 dias úteis.";
    const start = text.indexOf("João"),
      end = start + "João da Silva".length;
    const edit = {
      field: "text",
      category: "person",
      evidence: evidenceFromSelection(text, start, end),
      replacement: "[PESSOA_1]",
    };
    expect(redactionPreview(text, "text", [edit])).toBe(
      "Intime-se [PESSOA_1] em 15 dias úteis.",
    );
    expect(() => redactionPreview(text, "text", [edit, edit])).toThrow(
      "sobreposta",
    );
    expect(redactionPreview("Outras notas", "context.notes", [edit])).toBe(
      "Outras notas",
    );
  });
});
