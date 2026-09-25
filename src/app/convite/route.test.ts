import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("invitation callback", () => {
  it.each(["sign_in", "sign_up"])("preserves the ticket for %s", (status) => {
    const query = new URLSearchParams({
      __clerk_status: status,
      __clerk_ticket: "ticket+/=",
      redirect_url: "https://untrusted.example",
      unrelated: "value",
    });
    const response = GET(
      new Request(`https://app.atjud.com.br/convite?${query}`),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://app.atjud.com.br");
    expect(location.pathname).toBe(
      status === "sign_up" ? "/sign-up" : "/sign-in",
    );
    expect(location.searchParams.get("__clerk_ticket")).toBe("ticket+/=");
    expect(location.searchParams.get("__clerk_status")).toBe(status);
    expect(location.searchParams.has("redirect_url")).toBe(false);
    expect(location.searchParams.has("unrelated")).toBe(false);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("returns an already accepted invitation to the protected app without leaking the ticket", () => {
    const response = GET(
      new Request(
        "https://app.atjud.com.br/convite?__clerk_status=complete&__clerk_ticket=secret",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://app.atjud.com.br/notificacoes",
    );
  });

  it.each([
    "",
    "?__clerk_status=sign_up",
    "?__clerk_ticket=secret",
    "?__clerk_status=invalid&__clerk_ticket=secret",
  ])("rejects an incomplete callback %s", (query) => {
    const response = GET(
      new Request(`https://app.atjud.com.br/convite${query}`),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });
});
