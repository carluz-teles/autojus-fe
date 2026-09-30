import { describe, expect, it } from "vitest";

import type { DocumentTemplateVersion } from "../../services/document-templates.service";
import { choosePreviewVersion } from "./use-template-preview";

describe("preview version selection", () => {
  it("uses the persisted default even when a newer upload failed", () => {
    const versions = [
      {
        id: "new-failed",
        template_id: "template-1",
        version_no: 2,
        status: "FAILED",
      },
      {
        id: "older-ready",
        template_id: "template-1",
        version_no: 1,
        status: "READY",
        sample_pdf_url: "https://storage.example/ready",
      },
    ] as DocumentTemplateVersion[];

    expect(
      choosePreviewVersion(
        versions,
        { template_id: "template-1", version_id: "older-ready" },
        "template-1",
      )?.id,
    ).toBe("older-ready");
  });
});
