import { describe, expect, it, vi } from "vitest";

import type { ApiFetcher, PresignedStorage } from "@/lib/api/use-api";

import {
  confirmDocumentTemplateVersion,
  createDocumentTemplate,
  getDocumentTemplateDefault,
  putDocumentTemplateBytes,
  setDocumentTemplateDefault,
  startDocumentTemplateUpload,
} from "./document-templates.service";

describe("document template API contract", () => {
  it("reads the saved default and sends a version ID when changing it", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: { template_id: "template-1", version_id: "version-2" },
      })
      .mockResolvedValueOnce({ data: { version_id: "version-3" } });
    const signal = new AbortController().signal;

    expect(
      await getDocumentTemplateDefault(fetcher as ApiFetcher, signal),
    ).toEqual({
      template_id: "template-1",
      version_id: "version-2",
    });
    await setDocumentTemplateDefault(
      fetcher as ApiFetcher,
      "version-3",
      signal,
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/v1/document-template-default",
      { signal },
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/v1/document-template-default",
      {
        method: "PUT",
        body: { version_id: "version-3" },
        signal,
      },
    );
  });

  it("keeps create, upload and confirm as separate ordered calls", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: "template-1", name: "Modelo", archived: false },
      })
      .mockResolvedValueOnce({
        data: {
          version: { id: "version-1" },
          url: "https://storage.example/put",
          expires_in: 600,
        },
      })
      .mockResolvedValueOnce({ data: { id: "version-1", status: "READY" } });
    const put = vi.fn().mockResolvedValue(undefined);
    const file = new File(["docx bytes"], "modelo.docx");

    const template = await createDocumentTemplate(
      fetcher as ApiFetcher,
      "Modelo",
    );
    const upload = await startDocumentTemplateUpload(
      fetcher as ApiFetcher,
      template.id,
    );
    await putDocumentTemplateBytes(
      { put } as unknown as PresignedStorage,
      upload.url,
      file,
    );
    await confirmDocumentTemplateVersion(
      fetcher as ApiFetcher,
      template.id,
      upload.version.id,
    );

    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      "/v1/document-templates",
      "/v1/document-templates/template-1/versions/uploads",
      "/v1/document-templates/template-1/versions/version-1/confirm",
    ]);
    expect(put).toHaveBeenCalledExactlyOnceWith(
      "https://storage.example/put",
      file,
      undefined,
    );
    expect(fetcher.mock.calls[0][1]).toEqual({
      method: "POST",
      body: { name: "Modelo" },
      signal: undefined,
    });
    expect(fetcher.mock.calls[2][1]).toEqual({
      method: "POST",
      signal: undefined,
    });
  });
});
