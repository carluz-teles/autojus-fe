"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { usePrivateQueryClient } from "../hooks/_private/use-private-query-client";
import { useBackoffice } from "../hooks/use-backoffice";
import { BackofficeContext } from "../hooks/use-backoffice-context";

export function BackofficeBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionId, userId, orgId } = useAuth();
  return (
    <PrivateQueries key={`${sessionId}:${userId}:${orgId}`}>
      <BackofficeGate>{children}</BackofficeGate>
    </PrivateQueries>
  );
}

function PrivateQueries({ children }: { children: React.ReactNode }) {
  const client = usePrivateQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function BackofficeGate({ children }: { children: React.ReactNode }) {
  const access = useBackoffice();
  if (access.ready && access.session)
    return (
      <BackofficeContext.Provider value={access.session}>
        <div className="bg-background min-h-svh">
          <a
            href="#backoffice-content"
            className="bg-background sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:p-3"
          >
            Pular para a curadoria
          </a>
          <header className="bg-card border-b">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <Link href="/backoffice" className="font-display text-xl">
                  AtJud · Curadoria
                </Link>
                <Badge variant="secondary">Interno</Badge>
              </div>
              <Button variant="ghost" onClick={access.signOut}>
                <LogOut data-icon="inline-start" />
                Sair
              </Button>
            </div>
          </header>
          <main id="backoffice-content" className="mx-auto max-w-7xl px-6 py-8">
            <PrivateQueries
              key={`${access.session.user_id}:${access.session.revision}`}
            >
              {children}
            </PrivateQueries>
          </main>
        </div>
      </BackofficeContext.Provider>
    );

  return (
    <main className="bg-background grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <LockKeyhole
            aria-hidden
            className="text-muted-foreground mb-3 size-6"
          />
          <CardTitle>Backoffice de curadoria</CardTitle>
          <CardDescription>
            Acesso reservado à equipe interna habilitada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {access.loading ? (
            <div role="status" className="flex flex-col gap-3">
              <span>Verificando acesso interno…</span>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : null}
          {access.forbidden ? (
            <p role="alert">
              Sua conta não tem acesso a esta área. Entre em contato com o
              responsável pela curadoria.
            </p>
          ) : null}
          {access.expired ? (
            <p role="alert">
              Sua sessão expirou. Entre novamente para continuar.
            </p>
          ) : null}
          {access.unavailable ? (
            <p role="alert">
              Não foi possível verificar seu acesso. Tente novamente.
            </p>
          ) : null}
          {access.requiresSwitch ? (
            <p>
              Seu acesso interno foi confirmado. Entre na organização de
              curadoria para abrir suas tarefas.
            </p>
          ) : null}
          {access.switchError ? (
            <p role="alert" className="mt-3">
              Não foi possível trocar de organização. Tente novamente.
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          {access.requiresSwitch ? (
            <Button
              onClick={access.switchOrganization}
              disabled={access.switching}
            >
              {access.switching ? "Entrando…" : "Entrar na curadoria"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : null}
          {access.unavailable || access.forbidden ? (
            <Button variant="outline" onClick={access.retry}>
              Verificar acesso novamente
            </Button>
          ) : null}
          {access.expired ? (
            <Link
              className={buttonVariants()}
              href="/sign-in?redirect_url=%2Fbackoffice"
            >
              Entrar novamente
            </Link>
          ) : (
            <Button variant="ghost" onClick={access.signOut}>
              Sair
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
