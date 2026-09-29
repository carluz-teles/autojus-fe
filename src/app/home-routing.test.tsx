import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, apiFetch, redirect, clerkProvider } = vi.hoisted(() => ({
  auth: vi.fn(),
  apiFetch: vi.fn(),
  redirect: vi.fn(),
  clerkProvider: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("@/lib/api/client", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/landing/components/landing-page", () => ({
  LandingPage: () => <main>Landing pública</main>,
}));
vi.mock("@/features/notifications/notifications-page", () => ({
  NotificationsPage: () => <main>Central de notificações</main>,
}));
vi.mock("@/features/onboarding/components/onboarding-flow", () => ({
  OnboardingFlow: () => <main>Configurar escritório</main>,
}));
vi.mock("@/components/shell/organization-coordinator", () => ({
  OrganizationCoordinator: () => <main>Verificando escritório</main>,
}));
vi.mock("@clerk/nextjs", () => ({ ClerkProvider: clerkProvider }));
vi.mock("@/app/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => children,
}));

import { NAV_ITEMS, NAV_SECTIONS } from "@/components/shell/nav-config";
import PlatformProviders from "@/components/shell/platform-providers";
import { ONBOARDING_STEPS_COPY } from "@/features/onboarding-widget/copy";

import NotificationsPageRoute from "./(app)/notificacoes/page";
import OnboardingPage from "./onboarding/page";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ userId: "user-1", getToken: vi.fn() });
  redirect.mockImplementation((destination) => {
    throw new Error(`REDIRECT:${destination}`);
  });
  clerkProvider.mockImplementation(
    ({ children }: { children: React.ReactNode }) => children,
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("public home and authenticated entry", () => {
  it("renders the root landing page without consulting identity or the backend", async () => {
    vi.stubEnv("SITE_URL", "");
    const { default: Home } = await import("./page");
    expect(renderToStaticMarkup(<Home />)).toContain("Landing pública");
    expect(auth).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("uses the domain root in production canonical and Open Graph metadata", async () => {
    vi.stubEnv("SITE_URL", "https://atjud.example");
    vi.stubEnv("NODE_ENV", "production");
    const { metadata } = await import("./page");
    expect(metadata.alternates?.canonical).toBe("https://atjud.example/");
    expect(metadata.openGraph?.url).toBe("https://atjud.example/");
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("renders notifications at their own path instead of redirecting to marketing", () => {
    expect(renderToStaticMarkup(<NotificationsPageRoute />)).toContain(
      "Central de notificações",
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("delegates authenticated onboarding routing to the organization coordinator", async () => {
    expect(renderToStaticMarkup(await OnboardingPage())).toContain(
      "Verificando escritório",
    );
    expect(apiFetch).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends sign-in to the protected home and sign-up straight to onboarding (no home flash for new users)", () => {
    renderToStaticMarkup(<PlatformProviders>App</PlatformProviders>);
    expect(clerkProvider.mock.calls[0][0]).toMatchObject({
      signInFallbackRedirectUrl: "/notificacoes",
      signUpFallbackRedirectUrl: "/onboarding",
    });
    expect(clerkProvider.mock.calls[0][0]).not.toHaveProperty(
      "signInForceRedirectUrl",
    );
  });

  it("keeps notifications links and onboarding shortcuts inside the application", () => {
    const entries = [...NAV_ITEMS, ...NAV_SECTIONS.flatMap((s) => s.itens)];
    const notifications = entries.filter(
      (entry) => entry.label === "Notificações",
    );
    expect(notifications).toHaveLength(2);
    expect(notifications.every((entry) => entry.href === "/notificacoes")).toBe(
      true,
    );
    expect(entries.some((entry) => entry.href === "/")).toBe(false);
    expect(ONBOARDING_STEPS_COPY.first_triagem.href).toBe("/triagem");
    expect(ONBOARDING_STEPS_COPY.first_analise.href).toBe("/intimacoes");
    expect(ONBOARDING_STEPS_COPY.first_peca.href).toBe("/intimacoes");
  });
});
