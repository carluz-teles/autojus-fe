import { describe, expect, it } from "vitest";

import { subscriptionStatusLabel, subscriptionStatusTone } from "./labels";

describe("subscriptionStatusTone", () => {
  it("marks past_due as warning (needs user action) — never neutral", () => {
    expect(subscriptionStatusTone("past_due")).toBe("warning");
  });

  it.each([
    ["trialing", "info"],
    ["active", "success"],
    ["canceled", "neutral"],
  ] as const)("maps %s to %s", (status, tone) => {
    expect(subscriptionStatusTone(status)).toBe(tone);
  });
});

describe("subscriptionStatusLabel", () => {
  it("labels every known status in pt-BR", () => {
    expect(subscriptionStatusLabel("trialing")).toBe("Em teste");
    expect(subscriptionStatusLabel("active")).toBe("Ativo");
    expect(subscriptionStatusLabel("past_due")).toBe("Pagamento pendente");
    expect(subscriptionStatusLabel("canceled")).toBe("Cancelado");
  });
});
