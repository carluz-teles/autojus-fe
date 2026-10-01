import { describe, expect, it } from "vitest";

import { annotationFixture } from "../__tests__/annotation-fixture";
import {
  type AnnotationProtocol,
  protocolBody,
  protocolDefaults,
} from "./annotation-preparation";

describe("protocol preparation", () => {
  it("requires explicit review metadata, known types and separate real authorization", () => {
    const form = protocolDefaults();
    expect(() => protocolBody(form, null, [], false, "r")).toThrow();
    Object.assign(form, {
      key: "test",
      origin: "synthetic",
      matter_key: "civil",
      act_types: ["ciencia"],
      rubric: "Rubrica fictícia",
      review_reference: "synthetic:review",
      reviewed_at: "2026-09-29T12:00:00-03:00",
      reason: "Fixture",
      confirmed: true,
    });
    const catalog = [{ key: "ciencia", label: "Ciência" }];
    expect(protocolBody(form, null, catalog, false, "r")).toMatchObject({
      previous_revision_id: null,
      legal_rules: {},
      rule_sources: {},
      review_policy: {
        ordinary_reviews: 1,
        critical_reviews: 2,
        conflict_reviews: 2,
      },
    });
    expect(() => protocolBody(form, null, [], false, "r")).toThrow(/catálogo/i);
    form.origin = "real";
    form.review_reference = "review-real";
    expect(() => protocolBody(form, null, catalog, false, "r")).toThrow(
      /autoria/i,
    );
  });
  it("freezes complete sources and refuses duplicate rule identifiers", () => {
    const previous: AnnotationProtocol = {
      id: "prior",
      key: "protocol",
      origin: "synthetic",
      matter_key: "civil",
      revision: 1,
      previous_revision_id: null,
      definition: annotationFixture().protocol,
      digest: "d".repeat(64),
      recorded_at: "",
      author_person_id: "person",
      idempotent_replay: false,
    };
    const form = protocolDefaults(previous);
    expect(form.review_reference).toBe("");
    expect(form.reviewed_at).toBe("");
    Object.assign(form, {
      review_reference: "synthetic:revision",
      reviewed_at: "2026-09-29T12:00:00Z",
      reason: "Revisão sintética",
      confirmed: true,
    });
    form.rules = [
      {
        reference: "rule",
        quantity: 15,
        unit: "business_days",
        anchor_event: "publication",
        start_rule: "next_business_day",
        citation: "Norma fictícia",
        source_reference: "synthetic:source",
        review_note: "Revisão fictícia",
      },
    ];
    const catalog = form.act_types.map((key) => ({ key, label: key }));
    const command = protocolBody(form, previous, catalog, false, "r");
    expect(command).toMatchObject({
      previous_revision_id: "prior",
      legal_rules: { rule: { quantity: 15 } },
      rule_sources: { rule: { citation: "Norma fictícia" } },
    });
    form.rules.push(form.rules[0]);
    expect(() => protocolBody(form, previous, catalog, false, "r")).toThrow();
    form.rules = [];
    form.matter_key = "changed";
    expect(() => protocolBody(form, previous, catalog, false, "r")).toThrow(
      /linhagem/i,
    );
  });
});
