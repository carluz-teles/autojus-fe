import { describe, expect, it } from "vitest";

import {
  AUTOS_FETCH_RESULT_CODES,
  AUTOS_FETCH_RESULT_LABELS,
  autosFetchResultLabel,
} from "./autos-fetch-result";

describe("autosFetchResultLabel", () => {
  it("traduz todos os códigos sem expor o enum técnico", () => {
    expect(Object.keys(AUTOS_FETCH_RESULT_LABELS)).toEqual(
      AUTOS_FETCH_RESULT_CODES,
    );

    for (const code of AUTOS_FETCH_RESULT_CODES) {
      const label = autosFetchResultLabel(code);
      expect(label).toBeTruthy();
      expect(label).not.toContain("_");
      expect(label).not.toBe(code);
    }
  });
});
