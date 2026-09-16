import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  type GenerateAssessmentBinding,
  generateDraft,
} from "./pecas-v2.service";

const binding: GenerateAssessmentBinding = {
  assessmentVersionId: "11111111-1111-1111-1111-111111111111",
  assessmentContentHash: "hash-abc",
  inputFingerprint: "fp-xyz",
  expectedCurrentVersionId: null,
};

describe("geração com seleção de teses", () => {
  it("envia orientações + teses (sem binding = sem campos de assessment)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-08T18:00:00Z" } });
    await generateDraft(
      fetcher as ApiFetcher,
      "piece",
      ["thesis"],
      "Não presumir valores.",
    );
    expect(fetcher.mock.calls[0][1].body).toEqual({
      thesis_ids: ["thesis"],
      instructions: "Não presumir valores.",
    });
  });

  it("inclui os campos da conferência quando há binding", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-08T18:00:00Z" } });
    await generateDraft(
      fetcher as ApiFetcher,
      "piece",
      ["thesis"],
      "Focar prescrição.",
      binding,
    );
    expect(fetcher.mock.calls[0][1].body).toEqual({
      thesis_ids: ["thesis"],
      instructions: "Focar prescrição.",
      assessment_version_id: "11111111-1111-1111-1111-111111111111",
      assessment_content_hash: "hash-abc",
      input_fingerprint: "fp-xyz",
      // fresh draft: chave presente com valor null
      expected_current_version_id: null,
    });
  });

  it("NÃO envia assessment_validation_id (o BE deriva do registro)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-08T18:00:00Z" } });
    await generateDraft(fetcher as ApiFetcher, "piece", ["t"], "", binding);
    expect(fetcher.mock.calls[0][1].body).not.toHaveProperty(
      "assessment_validation_id",
    );
  });

  it("passa o expected_current_version_id quando o draft já gerou", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-08T18:00:00Z" } });
    await generateDraft(fetcher as ApiFetcher, "piece", ["t"], "", {
      ...binding,
      expectedCurrentVersionId: "22222222-2222-2222-2222-222222222222",
    });
    expect(fetcher.mock.calls[0][1].body.expected_current_version_id).toBe(
      "22222222-2222-2222-2222-222222222222",
    );
  });

  it("envia seleção e revisão no mesmo pedido de substituição (6º arg)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-07T18:00:00Z" } });
    await generateDraft(
      fetcher as ApiFetcher,
      "piece",
      ["thesis"],
      undefined,
      binding,
      { revision: "current" },
    );
    const body = fetcher.mock.calls[0][1].body;
    expect(body.replace_existing).toBe(true);
    expect(body.revision).toBe("current");
  });

  it("envia uma seleção vazia ao remover o último fundamento", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-07T18:00:00Z" } });
    await generateDraft(
      fetcher as ApiFetcher,
      "piece",
      [],
      undefined,
      binding,
      {
        revision: "current",
      },
    );
    expect(fetcher.mock.calls[0][1].body.thesis_ids).toEqual([]);
  });

  it("a primeira geração não solicita substituir conteúdo", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-07T18:00:00Z" } });
    await generateDraft(fetcher as ApiFetcher, "piece", ["thesis"]);
    expect(fetcher.mock.calls[0][1].body).not.toHaveProperty(
      "replace_existing",
    );
  });
});
