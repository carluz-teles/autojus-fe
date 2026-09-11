import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as redirectLlms } from "@/app/llm.text/route";
import { GET as serveLlms } from "@/app/llms.txt/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

import { getLandingSite, getLlmsText } from "./seo";

afterEach(() => vi.unstubAllEnvs());

describe("landing page discovery", () => {
  it("does not advertise an unconfigured domain even in a production build", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getLandingSite()).toEqual({
      origin: null,
      canonical: null,
      indexable: false,
    });
    expect(sitemap()).toEqual([]);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(getLlmsText()).toContain("[Landing page do AtJud](/)");
    expect(getLlmsText()).not.toMatch(/localhost|trycloudflare|undefined|null/);
  });

  it("keeps local development out of search with a configured canonical domain", () => {
    vi.stubEnv("SITE_URL", "https://atjud.example");
    vi.stubEnv("NODE_ENV", "development");
    expect(getLandingSite().indexable).toBe(false);
    expect(sitemap()).toEqual([]);
    expect(robots().sitemap).toBeUndefined();
  });

  it("uses one canonical public page and excludes authenticated routes", () => {
    vi.stubEnv("SITE_URL", " https://atjud.example/ ");
    vi.stubEnv("NODE_ENV", "production");
    expect(getLandingSite()).toEqual({
      origin: "https://atjud.example",
      canonical: "https://atjud.example/",
      indexable: true,
    });
    expect(sitemap()).toEqual([{ url: "https://atjud.example/" }]);
    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        disallow: "/",
        allow: expect.arrayContaining(["/$", "/_next/"]),
      },
      sitemap: "https://atjud.example/sitemap.xml",
    });
    expect(getLlmsText()).toContain(
      "[Landing page do AtJud](https://atjud.example/)",
    );
    expect(getLlmsText()).not.toMatch(
      /\]\([^)]*\/(processos|intimacoes|pecas)/,
    );
  });

  it.each([
    "not-a-url",
    "http://atjud.example",
    "https://atjud.example/lp",
    "https://atjud.example?preview=true",
    "https://atjud.example#section",
    "https://user:password@atjud.example",
    "https://localhost",
    "https://127.0.0.1",
    "https://preview.trycloudflare.com",
    "https://preview.ngrok-free.app",
  ])("rejects an unsuitable canonical origin: %s", (url) => {
    vi.stubEnv("SITE_URL", url);
    expect(() => getLandingSite()).toThrow(/SITE_URL/);
  });

  it("serves UTF-8 text and redirects the requested spelling to llms.txt", async () => {
    vi.stubEnv("SITE_URL", "");
    const response = serveLlms();
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(await response.text()).toContain("# AtJud\n");
    const redirect = redirectLlms();
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get("Location")).toBe("/llms.txt");
  });
});
