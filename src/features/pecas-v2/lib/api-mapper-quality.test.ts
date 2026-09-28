import { describe, expect, it } from "vitest";

import { mapPecaDetailToDraft } from "./api-mapper";
import type { PecaDetailAPI } from "./api-types";

describe("draft quality read model", () => {
  it("maps the deployed quality reason and superseded terminal fact", () => {
    const api = {
      id: "draft-1",
      title: "Peça",
      piece_type: "DEFENSE",
      status: "DRAFT",
      saga_state: "DRAFTED",
      current_version_id: "v1",
      content_revision: "r1",
      content_html: "<p>Interim</p>",
      content: "Interim",
      quality_authorization: { allowed: false, reason_code: "blocked" },
      superseded_at: null,
      created_at: "2026-09-25T04:00:00Z",
      updated_at: "2026-09-25T04:00:00Z",
      structured_content: null,
      intimation: null,
      process: null,
      deadline: null,
      attachments: [],
      process_documents: [],
      providences: [],
      parties: [],
      review: null,
      sent_to_signing_at: null,
      signed_at: null,
      filed_at: null,
      filing_number: "",
      signed_pdf_url: null,
      authorship: "assistant",
    } satisfies PecaDetailAPI;
    expect(mapPecaDetailToDraft(api).qualityAuthorization).toEqual({
      allowed: false,
      reasonCode: "blocked",
    });
    expect(
      mapPecaDetailToDraft({ ...api, superseded_at: "2026-09-25T04:01:00Z" })
        .supersededAt,
    ).toBe("2026-09-25T04:01:00Z");
  });
});
