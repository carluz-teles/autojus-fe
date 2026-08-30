"use client";

import { AlertCircle, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  type TrialBannerTone,
  useTrialBanner,
} from "../hooks/use-trial-banner";

const TONE_CONFIG: Record<
  TrialBannerTone,
  {
    role: "status" | "alert";
    icon: typeof AlertTriangle;
    containerClass: string;
    ctaVariant: "outline" | "destructive";
  }
> = {
  warning: {
    role: "status",
    icon: AlertTriangle,
    containerClass:
      "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
    ctaVariant: "outline",
  },
  danger: {
    role: "alert",
    icon: AlertCircle,
    containerClass:
      "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
    ctaVariant: "destructive",
  },
};

/**
 * Banner de trial acabando/expirado, full-width, acima da sidebar+conteúdo no
 * AppShell. Estado (visível? qual tom? qual texto? dismissed?) mora em
 * `useTrialBanner`; este componente só monta JSX a partir dele.
 */
export function TrialBanner() {
  const banner = useTrialBanner();
  if (!banner) return null;

  const {
    role,
    icon: Icon,
    containerClass,
    ctaVariant,
  } = TONE_CONFIG[banner.tone];

  return (
    <div
      role={role}
      className={cn(
        "flex w-full items-center gap-3 border-b px-4 py-2.5 sm:px-6",
        containerClass,
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-medium">
        <span className="sm:hidden">{banner.compactMessage}</span>
        <span className="hidden sm:inline">{banner.message}</span>
      </p>
      <Link
        href="/configuracoes"
        className={cn(
          buttonVariants({ variant: ctaVariant, size: "sm" }),
          "shrink-0",
        )}
      >
        Assinar agora
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Fechar aviso"
        onClick={banner.onDismiss}
      >
        <X />
      </Button>
    </div>
  );
}
