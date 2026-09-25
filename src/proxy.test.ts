import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { platformMiddleware } = vi.hoisted(() => ({
  platformMiddleware: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => platformMiddleware,
  createRouteMatcher: () => vi.fn(),
}));

import proxy, { config } from "./proxy";

const event = {} as NextFetchEvent;

describe("proxy matcher for the PDF worker", () => {
  it("serves the public PDF.js module without the authentication proxy", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: "/pdf.worker.min.mjs" }),
    ).toBe(false);
  });

  it.each([
    "/processos",
    "/api/private.mjs",
    "/__clerk/session",
    "/private.json",
  ])("keeps %s behind the authentication proxy", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });
});

describe("public marketing boundary", () => {
  beforeEach(() => {
    platformMiddleware.mockReset();
    platformMiddleware.mockReturnValue(new NextResponse(null, { status: 401 }));
  });

  it.each([
    "/",
    "/?preview=true",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/llm.text",
    "/sitemap.xml?refresh=true",
  ])("renders %s without initializing authentication", async (path) => {
    const response = await proxy(
      new NextRequest(`http://localhost${path}`),
      event,
    );
    expect(response?.status).toBe(200);
    expect(platformMiddleware).not.toHaveBeenCalled();
  });

  it.each([
    "/notificacoes",
    "/notificacoes?tab=unread",
    "/processos",
    "/onboarding",
    "/lp/processos",
    "/lp/opengraph-image",
    "/lp-private",
    "/lpreview",
    "/api/lp",
    "/sign-in",
    "/api/robots.txt",
    "/sitemap.xml/private",
    "/llms.txt-private",
    "/llm.text/private",
  ])("preserves the platform middleware for %s", async (path) => {
    const request = new NextRequest(`http://localhost${path}`);
    const response = await proxy(request, event);
    expect(platformMiddleware).toHaveBeenCalledExactlyOnceWith(request, event);
    expect(response?.status).toBe(401);
  });
});
