import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { platformMiddleware } = vi.hoisted(() => ({
  platformMiddleware: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => platformMiddleware,
  createRouteMatcher: () => vi.fn(),
}));

import proxy from "./proxy";

const event = {} as NextFetchEvent;

describe("public marketing boundary", () => {
  beforeEach(() => {
    platformMiddleware.mockReset();
    platformMiddleware.mockReturnValue(new NextResponse(null, { status: 401 }));
  });

  it.each([
    "/lp",
    "/lp/",
    "/lp?preview=true",
    "/lp/opengraph-image",
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
    "/",
    "/processos",
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
