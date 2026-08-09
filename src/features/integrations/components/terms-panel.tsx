"use client";

import { useIntegrations } from "../hooks/use-integrations";
import { TermsSection } from "./terms-section";

// Painel da seção Termos (/settings/termos): resolve o scope ativo e entrega ao
// form. Termos são o QUE monitorar (OABs; depois CNPJs/nomes) — separados das
// integrações, que são as CONEXÕES com as fontes (futuras exigirão credencial).
export function TermsPanel() {
  const { integrations, isLoading } = useIntegrations();
  const djen = integrations.find((i) => i.source === "DJEN");

  if (isLoading) {
    return (
      <div className="bg-muted/40 mt-8 h-64 animate-pulse rounded-xl border" />
    );
  }

  return (
    <div className="mt-8">
      <TermsSection initialOab={djen?.scope.oab} />
    </div>
  );
}
