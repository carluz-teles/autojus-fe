"use client";

import { useAuth, useClerk, useOrganizationList, useUser } from "@clerk/nextjs";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { PersonalProfile } from "@/features/onboarding/components/personal-profile";
import type { Me } from "@/features/onboarding/types";
import { apiFetch } from "@/lib/api/client";
import {
  activateAndVerifyOrganization,
  beginOrganizationTransition,
  selectOrganizationTarget,
  transitionSnapshot,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";
import { APP_HOME_PATH } from "@/lib/routes";

type Membership = { organization: { id: string; name: string } };
type Coordinator = {
  memberships: Membership[];
  activeOrganizationId: string | null;
  switchOrganization: (id: string) => Promise<void>;
  switching: boolean;
};

const OrganizationContext = createContext<Coordinator | null>(null);

export function useOrganizationCoordinator() {
  return useContext(OrganizationContext);
}

type View =
  | "loading"
  | "selection"
  | "error"
  | "profile"
  | "waiting"
  | "configure"
  | "create"
  | "ready";

export function OrganizationCoordinator({
  children,
  mode,
}: {
  children?: React.ReactNode;
  mode: "app" | "onboarding";
}) {
  const { isLoaded: authLoaded, orgId, userId } = useAuth();
  const clerk = useClerk();
  const { user } = useUser();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const qc = useQueryClient();
  const router = useRouter();
  const [view, setView] = useState<View>("loading");
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState<Me | null>(null);
  const busy = useRef(false);
  const attempted = useRef<string | null>(null);
  const memberships = useMemo(
    () => userMemberships.data ?? [],
    [userMemberships.data],
  );
  const fullyLoaded =
    isLoaded &&
    !userMemberships.isLoading &&
    !userMemberships.isFetching &&
    !userMemberships.hasNextPage &&
    !userMemberships.isError;

  useEffect(() => {
    if (isLoaded && userMemberships.hasNextPage && !userMemberships.isFetching)
      userMemberships.fetchNext();
  }, [isLoaded, userMemberships]);

  const switchOrganization = useCallback(
    async (id: string) => {
      if (
        busy.current ||
        !setActive ||
        !memberships.some((m) => m.organization.id === id)
      )
        return;
      if (view === "ready" && transitionSnapshot().organizationId === id)
        return;
      attempted.current = id;
      busy.current = true;
      setView("loading");
      setMessage("");
      const generation = beginOrganizationTransition();
      try {
        await qc.cancelQueries();
        qc.clear();
        if (!userId) throw new Error("Sessão indisponível.");
        const me = await activateAndVerifyOrganization<Me>(
          id,
          userId,
          (organization) => setActive({ organization }),
          (organizationId) =>
            clerk.session?.getToken({ organizationId, skipCache: true }) ??
            Promise.resolve(null),
          (token) =>
            apiFetch<Me>("/v1/identity/me", { getToken: async () => token }),
        );
        if (!verifyOrganizationTransition(generation, id)) return;
        setIdentity(me);
        const profileIncomplete = me.profile_onboarding_completed_at === null;
        if (
          !profileIncomplete &&
          me.organization_state === "ready" &&
          mode === "app"
        ) {
          const marker = window.sessionStorage.getItem(
            "atjus:verified-navigation",
          );
          if (marker === id)
            window.sessionStorage.removeItem("atjus:verified-navigation");
          else if (orgId !== id) {
            window.sessionStorage.setItem("atjus:verified-navigation", id);
            router.replace(APP_HOME_PATH);
            router.refresh();
            window.location.replace(APP_HOME_PATH);
            return;
          }
        }
        if (profileIncomplete) setView("profile");
        else if (me.organization_state === "ready") setView("ready");
        else if (
          me.organization_state === "onboarding_required" &&
          me.role === "ADMIN"
        )
          setView("configure");
        else setView("waiting");
        if (profileIncomplete) {
          if (mode === "app" && me.organization_state !== "ready")
            router.replace("/onboarding");
        } else if (me.organization_state === "ready") {
          router.replace(APP_HOME_PATH);
          router.refresh();
        } else if (mode === "app") {
          router.replace("/onboarding");
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível entrar no escritório. Tente novamente.",
        );
        setView("error");
      } finally {
        busy.current = false;
      }
    },
    [
      clerk.session,
      memberships,
      mode,
      orgId,
      qc,
      router,
      setActive,
      userId,
      view,
    ],
  );

  useEffect(() => {
    if (!authLoaded || !isLoaded || !userId || !fullyLoaded || busy.current)
      return;
    const hint = new URLSearchParams(window.location.search).get("org_id");
    const target = selectOrganizationTarget(
      memberships.map((m) => m.organization.id),
      orgId ?? null,
      hint,
    );
    if (target) {
      if (
        attempted.current !== target &&
        transitionSnapshot().organizationId !== target
      ) {
        attempted.current = target;
        void switchOrganization(target);
      }
      return;
    }
    if (attempted.current === "none") return;
    attempted.current = "none";
    if (hint) {
      queueMicrotask(() => {
        setMessage(
          "O convite ainda não aparece entre seus escritórios. Tente novamente.",
        );
        setView("error");
      });
      return;
    }
    if (memberships.length > 0) {
      queueMicrotask(() => setView("selection"));
      return;
    }
    // Revocation must unmount the tenant subtree before any awaited Clerk work.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView("loading");
    setMessage("");
    busy.current = true;
    const generation = beginOrganizationTransition();
    void (async () => {
      try {
        await qc.cancelQueries();
        qc.clear();
        if (orgId) {
          if (!setActive) throw new Error("Sessão indisponível.");
          await setActive({ organization: null });
        }
        if (transitionSnapshot().generation !== generation) return;
        const token = await clerk.session?.getToken({ skipCache: true });
        if (!token) throw new Error("Sessão sem token de autenticação.");
        if (transitionSnapshot().generation !== generation) return;
        const me = await apiFetch<Me>("/v1/identity/me", {
          getToken: async () => token,
        });
        if (transitionSnapshot().generation !== generation) return;
        if (
          me.user_id !== userId ||
          me.organization_state !== "no_active_org" ||
          me.clerk_org_id !== ""
        )
          throw new Error("Não foi possível confirmar sua conta.");
        setIdentity(me);
        setView("create");
        if (mode === "app") router.replace("/onboarding");
      } catch (error) {
        if (transitionSnapshot().generation !== generation) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar sua conta.",
        );
        setView("error");
      } finally {
        busy.current = false;
      }
    })();
  }, [
    authLoaded,
    isLoaded,
    userId,
    fullyLoaded,
    memberships,
    orgId,
    switchOrganization,
    clerk.session,
    qc,
    setActive,
    mode,
    router,
  ]);

  const retry = useCallback(() => {
    attempted.current = null;
    setView("loading");
    if (userMemberships?.revalidate) void userMemberships.revalidate();
  }, [userMemberships]);

  const profileCompleted = useCallback(async () => {
    if (identity?.organization_state === "ready") {
      router.replace(APP_HOME_PATH);
      router.refresh();
      if (mode === "app" && identity.clerk_org_id) {
        window.sessionStorage.setItem(
          "atjus:verified-navigation",
          identity.clerk_org_id,
        );
        window.location.replace(APP_HOME_PATH);
      } else setView("ready");
    } else if (
      identity?.organization_state === "onboarding_required" &&
      identity.role === "ADMIN"
    )
      setView("configure");
    else setView("waiting");
  }, [identity, mode, router]);

  const context: Coordinator = {
    memberships,
    activeOrganizationId: identity?.clerk_org_id ?? null,
    switchOrganization,
    switching: view === "loading",
  };
  const shownView = userMemberships.isError
    ? "error"
    : view === "ready" && memberships.length === 0
      ? "loading"
      : view;
  const shownMessage = userMemberships.isError
    ? "Não foi possível carregar seus escritórios."
    : message;

  return (
    <OrganizationContext.Provider value={context}>
      {shownView === "ready" ? (
        mode === "app" ? (
          <TenantQueryBoundary
            key={`${userId}:${identity?.clerk_org_id}:${transitionSnapshot().generation}`}
          >
            {children}
          </TenantQueryBoundary>
        ) : (
          <Status text="Abrindo seu escritório…" />
        )
      ) : null}
      {shownView === "loading" ? (
        <Status text="Preparando seu escritório…" />
      ) : null}
      {shownView === "selection" ? (
        <main className="grid min-h-screen place-items-center p-6">
          <div className="surface-panel w-full max-w-md p-6">
            <h1 className="font-display mb-4 text-xl">Escolha um escritório</h1>
            {memberships.map((m) => (
              <button
                type="button"
                key={m.organization.id}
                className="hover:bg-hover flex min-h-11 w-full items-center rounded-lg px-3 text-left"
                onClick={() => void switchOrganization(m.organization.id)}
              >
                {m.organization.name}
              </button>
            ))}
          </div>
        </main>
      ) : null}
      {shownView === "error" ? (
        <main className="grid min-h-screen place-items-center p-6">
          <div className="surface-panel w-full max-w-md p-6">
            <h1 className="font-display text-xl">
              Não foi possível abrir o escritório
            </h1>
            <p role="alert" className="text-muted-foreground mt-2">
              {shownMessage}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2"
                onClick={retry}
              >
                Tentar novamente
              </button>
              {memberships.length > 1 ? (
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2"
                  onClick={() => setView("selection")}
                >
                  Outro escritório
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg border px-4 py-2"
                onClick={() => void clerk.signOut()}
              >
                Sair
              </button>
            </div>
          </div>
        </main>
      ) : null}
      {shownView === "profile" ? (
        <PersonalProfile user={user} onComplete={profileCompleted} />
      ) : null}
      {shownView === "waiting" ? (
        <main className="grid min-h-screen place-items-center p-6">
          <div className="surface-panel max-w-md p-6">
            <h1 className="font-display text-xl">Aguardando configuração</h1>
            <p className="text-muted-foreground mt-2">
              Um administrador precisa concluir a configuração deste escritório.
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg border px-4 py-2"
              onClick={() => setView("selection")}
            >
              Escolher outro escritório
            </button>
          </div>
        </main>
      ) : null}
      {shownView === "configure" || shownView === "create" ? (
        mode === "onboarding" ? (
          <OnboardingFlow existingOrganization={shownView === "configure"} />
        ) : (
          <Status text="Abrindo configuração…" />
        )
      ) : null}
    </OrganizationContext.Provider>
  );
}

function Status({ text }: { text: string }) {
  return (
    <main className="grid min-h-screen place-items-center" role="status">
      {text}
    </main>
  );
}

function TenantQueryBoundary({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
