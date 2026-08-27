"use client";

import { ArrowRight, Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { onboardingWidgetCopy } from "../copy";
import {
  type OnboardingWidgetStepViewModel,
  type OnboardingWidgetViewModel,
  useOnboardingWidget,
} from "../hooks/use-onboarding-widget";

// Sem o guia "tudo pronto" persistente (decisão de produto travada): quando o
// hook para de retornar view-model (dismiss OU todos os passos concluídos),
// este wrapper segura o último view-model por EXIT_DURATION_MS pra tocar o
// fade-out antes de desmontar de verdade — em vez de sumir abrupto.
const EXIT_DURATION_MS = 220;

export function OnboardingWidget() {
  const vm = useOnboardingWidget();
  const [renderedVm, setRenderedVm] =
    useState<OnboardingWidgetViewModel | null>(null);
  const [exiting, setExiting] = useState(false);
  const hadVmRef = useRef(false);

  // Sincroniza com o "sistema externo" tempo (setTimeout do fade-out) — não é
  // dado derivável no render, é uma transição temporizada mesmo (mesma classe
  // de exceção já aceita como warning em partida-ephemeral.tsx/nova-tarefa-modal.tsx:
  // regra rebaixada a "warn" no eslint.config.mjs, não bloqueia o green gate).
  useEffect(() => {
    if (vm) {
      hadVmRef.current = true;
      setRenderedVm(vm);
      setExiting(false);
      return;
    }
    if (!hadVmRef.current) return;
    hadVmRef.current = false;
    setExiting(true);
    const timer = setTimeout(() => setRenderedVm(null), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [vm]);

  if (!renderedVm) return null;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 left-4 z-40 sm:left-auto sm:w-[380px]",
        "transition-opacity duration-200 motion-reduce:transition-none",
        exiting ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {renderedVm.collapsed ? (
        <CollapsedPill vm={renderedVm} />
      ) : (
        <ExpandedCard vm={renderedVm} />
      )}
    </div>
  );
}

function CollapsedPill({ vm }: { vm: OnboardingWidgetViewModel }) {
  return (
    <button
      type="button"
      onClick={vm.onToggleCollapse}
      aria-label={onboardingWidgetCopy.expandAria}
      className="bg-card ring-hairline reveal hover:ring-gold/40 text-foreground flex w-full cursor-pointer items-center justify-between gap-2 rounded-full py-2.5 pr-3 pl-4 text-[13px] font-medium transition-shadow"
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="tabular-nums">
          {vm.doneCount}/{vm.totalCount}
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <span className="truncate">{onboardingWidgetCopy.pillLabel}</span>
      </span>
      <ChevronUp className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}

function ExpandedCard({ vm }: { vm: OnboardingWidgetViewModel }) {
  return (
    <div className="bg-card ring-hairline reveal max-h-[calc(100vh-2rem)] w-full overflow-y-auto overscroll-contain rounded-xl p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-gold-foreground text-[10.5px] font-semibold tracking-[0.12em] uppercase">
          {onboardingWidgetCopy.eyebrow}
        </span>
        <button
          type="button"
          onClick={vm.onToggleCollapse}
          aria-label={onboardingWidgetCopy.collapseAria}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -m-1 cursor-pointer rounded-md p-1 outline-none focus-visible:ring-2"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <h2 className="font-display mt-1.5 text-xl leading-snug font-medium">
        {vm.title}
      </h2>

      <div className="mt-4 flex items-center gap-3" aria-live="polite">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-gold h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${vm.progressPct}%` }}
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
          {vm.progressLabel}
        </span>
      </div>

      {/* Corrige colisão estrutural: o card é `position: fixed` no canto
          inferior-direito por cima de QUALQUER tela do app — sem um teto de
          altura, com 5 passos (role ADMIN) ele já ultrapassa ~550px e, em
          viewports baixas (laptop com devtools aberto, telas curtas, celular
          em paisagem), cobre controles que ficam perto do topo do conteúdo
          (ex.: botão "Adicionar" da aba Termos). Limitar só esta lista
          interna (`max-h-[45vh]`) NÃO basta: header + título + barra de
          progresso + rodapé continuam sem teto, então a soma ainda estoura a
          viewport em telas baixas. O teto real está no CONTAINER EXTERNO do
          card (`max-h-[calc(100vh-2rem)] overflow-y-auto` na div de
          `ExpandedCard`) — o card inteiro nunca ultrapassa a altura da
          viewport menos uma margem de segurança. Esta lista mantém seu
          próprio scroll como limite adicional dentro do card. `-mx-1 px-1`
          evita que a barra de rolagem invada o padding do card. */}
      <div className="-mx-1 max-h-[45vh] overflow-y-auto overscroll-contain px-1">
        {vm.steps.map((step, index) => (
          <StepRow key={step.id} step={step} number={index + 1} />
        ))}
      </div>

      <div className="border-border mt-1 flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-muted-foreground text-[12px]">
          {vm.remainingLabel}
        </span>
        <button
          type="button"
          onClick={vm.onDismiss}
          disabled={vm.isDismissing}
          aria-label={onboardingWidgetCopy.dismissAria}
          className="text-muted-foreground hover:text-foreground cursor-pointer text-[12px] font-medium underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          {onboardingWidgetCopy.dismiss}
        </button>
      </div>
    </div>
  );
}

function StepRow({
  step,
  number,
}: {
  step: OnboardingWidgetStepViewModel;
  number: number;
}) {
  const { status } = step;
  const isCurrent = status === "current";

  return (
    <div className="border-border flex items-start gap-3 border-t py-3 first:border-t-0">
      <StepCircle status={status} number={number} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13.5px] leading-snug",
            isCurrent && "text-foreground font-semibold",
            status === "done" && "text-foreground font-normal",
            status === "future" && "text-muted-foreground font-normal",
          )}
        >
          {step.title}
        </p>

        {isCurrent ? (
          <>
            <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
              {step.description}
            </p>
            <Link
              href={step.href}
              aria-label={`${step.ctaLabel} — ${step.title}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-2.5 has-data-[icon=inline-end]:pr-3",
              )}
            >
              {step.ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StepCircle({
  status,
  number,
}: {
  status: OnboardingWidgetStepViewModel["status"];
  number: number;
}) {
  if (status === "done") {
    return (
      <span
        className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Check className="size-3.5" />
      </span>
    );
  }

  if (status === "current") {
    return (
      <span
        className="border-gold-foreground text-gold-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold tabular-nums"
        aria-hidden="true"
      >
        {number}
      </span>
    );
  }

  return (
    <span
      className="border-muted-foreground text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums"
      aria-hidden="true"
    >
      {number}
    </span>
  );
}
