import { describe, expect, it } from "vitest";

import { redactionFields } from "./import-admission";
import { importContextEntries } from "./import-context";
import type { ImportContext, ImportItem } from "./imports";

const context: ImportContext = {
  court: "synthetic:court",
  procedure: "common",
  channel: "synthetic",
  legal_date: null,
  publication_date: null,
  recipient_role: null,
  notes: null,
};

describe("captured commercial context", () => {
  it("preserves old context and distinguishes unknown from captured empty", () => {
    expect(importContextEntries(context)).toEqual(Object.entries(context));
    const extended: ImportContext = {
      ...context,
      commercial_type: {
        schema_version: "intimation-commercial-type-v1",
        document_type: "Despacho",
        communication_kind: null,
        intimation_type: "INTIMACAO",
        declared_deadline: "",
      },
    };
    expect(importContextEntries(extended)).toEqual(
      expect.arrayContaining([
        ["commercial_type.document_type", "Despacho"],
        ["commercial_type.communication_kind", "Não capturado"],
        ["commercial_type.declared_deadline", "Capturado vazio"],
      ]),
    );
    expect(
      importContextEntries(extended).every(
        ([, value]) => value === null || typeof value === "string",
      ),
    ).toBe(true);
    expect(extended.commercial_type?.declared_deadline).toBe("");
  });

  it("offers every captured metadata string for privacy review without inventing missing values", () => {
    const item: ImportItem = {
      id: "item",
      row_number: 1,
      snapshot_digest: "a".repeat(64),
      state: "awaiting_privacy",
      errors: [],
      duplicate_rows: [],
      duplicate_ids: [],
      input: {
        text: "Fatos sintéticos",
        origin: "synthetic",
        source_kind: "manual_import",
        source_reference: "synthetic:source",
        captured_at: "2026-09-01T00:00:00Z",
        group_key: "synthetic:group",
        context: {
          ...context,
          commercial_type: {
            schema_version: "intimation-commercial-type-v1",
            document_type: "Despacho para João",
            communication_kind: null,
            intimation_type: "INTIMACAO",
            declared_deadline: "",
          },
        },
      },
    };
    const fields = redactionFields(item);
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "context.commercial_type.document_type",
          text: "Despacho para João",
        }),
        expect.objectContaining({
          key: "context.commercial_type.intimation_type",
          text: "INTIMACAO",
        }),
        expect.objectContaining({
          key: "context.commercial_type.declared_deadline",
          text: "",
        }),
      ]),
    );
    expect(
      fields.some(
        (field) => field.key === "context.commercial_type.communication_kind",
      ),
    ).toBe(false);
  });
});
