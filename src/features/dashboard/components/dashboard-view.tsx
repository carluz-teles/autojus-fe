"use client";

import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/mock-ui/layout";

/**
 * Dashboard ainda não tem dado real por trás (a versão anterior era mock: feed
 * de atividade e KPIs hardcoded) — placeholder "Em breve" até a fatia ganhar um
 * ERD/read model de verdade. Ver deferred-features-backlog.
 */
export function DashboardView() {
  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Dashboard"
        descricao="O que exige providência hoje, e como o escritório está andando."
      />

      <div className="border-border text-muted-foreground mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <Sparkles className="size-6" aria-hidden />
        <p className="text-sm">Em breve.</p>
      </div>
    </div>
  );
}
