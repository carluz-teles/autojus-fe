"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { Card } from "@/components/ui/card";

import { Step2Company } from "./step2-company";

/**
 * Casca client do onboarding: só o passo da empresa (cria o tenant) num Card.
 * OAB/fontes e convite de time saíram do wizard (2026-08-19) — o BE já marca
 * onboarding_completed_at no primeiro save do perfil da org, então terminar
 * aqui é suficiente pra destravar o app. O nome vem do sign-up do Clerk e a
 * foto vive no /profile, então não há passo de dados pessoais.
 */
export function OnboardingWizard() {
  const router = useRouter();

  const finish = useCallback(() => router.push("/prazos"), [router]);

  return (
    <div className="flex flex-col gap-8">
      {/* O filete de latão no topo é a assinatura "Ledger" do card do wizard. */}
      <Card className="border-t-gold/70 border-t-2 p-8 shadow-md sm:p-12">
        <Step2Company onDone={finish} />
      </Card>
    </div>
  );
}
