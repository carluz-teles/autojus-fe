import { describe, expect, it } from "vitest";

import { formatCentsToBRL } from "./format";

// Intl.NumberFormat("pt-BR", {style:"currency"}) joins "R$" and the number with
// U+00A0 (non-breaking space), not a regular space — asserting against " "
// explicitly so the test doesn't rely on eyeballing an invisible character.
describe("formatCentsToBRL", () => {
  it("formats cents (Stripe's unit) as pt-BR currency", () => {
    expect(formatCentsToBRL(2990)).toBe("R$ 29,90");
  });

  it("formats a whole-real amount without stray decimals", () => {
    expect(formatCentsToBRL(10000)).toBe("R$ 100,00");
  });

  it("formats zero", () => {
    expect(formatCentsToBRL(0)).toBe("R$ 0,00");
  });
});
