import { describe, expect, it, vi } from "vitest";

import { ContentSaveQueue } from "./content-save-queue";

describe("ContentSaveQueue", () => {
  it("serializes typing and manual flush against the acknowledged revision", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests: { html: string; revision: string }[] = [];
    const save = async (html: string, revision: string) => {
      requests.push({ html, revision });
      if (html === "first") await wait;
      return html + "-revision";
    };
    const q = new ContentSaveQueue("original", save, () => {});
    q.change("first");
    const automatic = q.flush();
    q.change("second");
    q.change("latest");
    const manual = q.flush();
    expect(requests).toEqual([{ html: "first", revision: "original" }]);
    release();
    await Promise.all([automatic, manual]);
    expect(requests).toEqual([
      { html: "first", revision: "original" },
      { html: "latest", revision: "first-revision" },
    ]);
    expect(q.dirty).toBe(false);
  });
  it("keeps the newest edit after a failed request and retries without advancing revision", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValue("saved");
    const q = new ContentSaveQueue("original", save, () => {});
    q.change("draft");
    await expect(q.flush()).rejects.toThrow("offline");
    expect(q.state).toBe("error");
    expect(q.dirty).toBe(true);
    expect(q.revision).toBe("original");
    q.change("recovered");
    await q.flush();
    expect(save).toHaveBeenLastCalledWith("recovered", "original");
    expect(q.state).toBe("saved");
  });
});
