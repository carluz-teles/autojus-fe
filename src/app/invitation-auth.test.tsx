import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signIn, signUp } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ SignIn: signIn, SignUp: signUp }));

import SignInPage from "./(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "./(auth)/sign-up/[[...sign-up]]/page";

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockReturnValue(null);
  signUp.mockReturnValue(null);
});

describe("invitation authentication", () => {
  it.each([
    ["sign_in", SignInPage, signIn],
    ["sign_up", SignUpPage, signUp],
  ] as const)(
    "keeps %s invitees in the app after authenticating",
    async (status, Page, component) => {
      const markup = renderToStaticMarkup(
        await Page({
          searchParams: Promise.resolve({
            __clerk_status: status,
            __clerk_ticket: "test-ticket",
          }),
        }),
      );
      expect(markup).toContain("Você foi convidado para um escritório.");
      expect(component.mock.calls[0][0]).toMatchObject({
        forceRedirectUrl: "/notificacoes",
      });
    },
  );

  it.each([
    [SignInPage, signIn],
    [SignUpPage, signUp],
  ] as const)(
    "preserves normal authentication redirects",
    async (Page, component) => {
      const markup = renderToStaticMarkup(
        await Page({ searchParams: Promise.resolve({}) }),
      );
      expect(markup).not.toContain("Você foi convidado");
      expect(component.mock.calls[0][0].forceRedirectUrl).toBeUndefined();
    },
  );
});
