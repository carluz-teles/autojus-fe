"use client";

import { useState } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { ConfigFontes } from "@/features/prazos/components/config/config-fontes";

import { ImportPreparation } from "./import-preparation";

export function FirstImportView() {
  const [step, setStep] = useState<"access" | "oab">("access");
  return (
    <PageFrame
      header={
        <>
          <ShellBackLink href="/processos" label="Voltar aos processos" />
          <span className="font-medium">Primeira importação</span>
        </>
      }
    >
      <div className="mx-auto w-full max-w-[760px] space-y-5 px-4 py-7 sm:px-8">
        {step === "access" ? (
          <ImportPreparation onContinue={() => setStep("oab")} />
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setStep("access")}>
              Voltar à preparação
            </Button>
            <ConfigFontes
              initialTab="termos"
              onPrepareAccess={() => setStep("access")}
            />
          </>
        )}
      </div>
    </PageFrame>
  );
}
