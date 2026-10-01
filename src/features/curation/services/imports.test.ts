import { describe, expect, it, vi } from "vitest";

import { buildImportBody, readImportFile, stageImport } from "./imports";

describe("private import", () => {
  it("preserves raw structured JSON so the server can reject duplicate keys", async () => {
    const items = '[{"text":"first","text":"second"}]';
    const body = buildImportBody("request", "Lote sintético", items);
    expect(body).toContain(items);
    const api = vi
      .fn()
      .mockResolvedValue({ data: { request_id: "request", replayed: false } });
    await stageImport(api, body);
    expect(api).toHaveBeenCalledWith("/v1/curation/imports", {
      method: "POST",
      serializedJson: body,
    });
    expect(body).not.toContain("tenant_id");
  });
  it("rejects invalid UTF-8 and oversized files before allocating their content", async () => {
    const invalid = {
      size: 1,
      arrayBuffer: async () => new Uint8Array([255]).buffer,
    } as File;
    await expect(readImportFile(invalid)).rejects.toThrow();
    const oversized = {
      size: 3 << 20,
      arrayBuffer: vi.fn(),
    } as unknown as File;
    await expect(readImportFile(oversized)).rejects.toThrow("2 MiB");
    expect(oversized.arrayBuffer).not.toHaveBeenCalled();
  });
});
