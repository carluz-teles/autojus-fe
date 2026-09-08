import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { generateDraft } from "./pecas-v2.service";

describe("geração com seleção de teses", () => {
  it("envia seleção e revisão no mesmo pedido de substituição", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-07T18:00:00Z" } });
    await generateDraft(fetcher as ApiFetcher, "piece", ["thesis"], undefined, {
      revision: "current",
    });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      "/v1/pecas/piece/generate",
      {
        method: "POST",
        body: {
          thesis_ids: ["thesis"],
          instructions: undefined,
          replace_existing: true,
          revision: "current",
        },
      },
    );
  });
  it("envia uma seleção vazia ao remover o último fundamento", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ data: { updated_at: "2026-09-07T18:00:00Z" } });
    await generateDraft(fetcher as ApiFetcher, "piece", [], undefined, {
      revision: "current",
    });
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
