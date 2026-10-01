import { describe, expect, it } from "vitest";

import {
  type SamplingForm,
  samplingFreezeBody,
  type SamplingPopulation,
} from "./sampling";

const population: SamplingPopulation = {
  digest: "a".repeat(64),
  sources: [
    {
      source_link_id: "source-1",
      case_version_id: "version-1",
      origin: "synthetic",
      matter_key: "civel",
      legal_date: "2026-09-01",
      knowledge_as_of: "2026-09-29T00:00:00Z",
      purposes: ["evaluation"],
      reserved_split: null,
    },
  ],
};
const form: SamplingForm = {
  lineage_key: "synthetic:pilot",
  seed: "synthetic:seed",
  origin: "synthetic",
  matter_key: "",
  sample_size: 100,
  population_digest: population.digest,
  screening: {
    "source-1": { stratum: "residual", reason: "synthetic:screening" },
  },
};
describe("sampling command", () => {
  it("requires complete screening of the eligible frame and no client split", () => {
    const body = samplingFreezeBody("request", form, population);
    expect(body.screening).toEqual([
      {
        source_link_id: "source-1",
        stratum: "residual",
        reason: "synthetic:screening",
      },
    ]);
    expect(body).not.toHaveProperty("tenant_id");
    expect(body).not.toHaveProperty("split");
    expect(() =>
      samplingFreezeBody("request", { ...form, screening: {} }, population),
    ).toThrow("todos os casos");
  });
  it("does not silently refresh a stale population or use a case without evaluation permission", () => {
    expect(() =>
      samplingFreezeBody("request", form, {
        ...population,
        digest: "b".repeat(64),
      }),
    ).toThrow("Reconcilie");
    expect(() =>
      samplingFreezeBody("request", form, {
        ...population,
        sources: [{ ...population.sources[0], purposes: ["rag"] }],
      }),
    ).toThrow("Não há casos");
  });
});
