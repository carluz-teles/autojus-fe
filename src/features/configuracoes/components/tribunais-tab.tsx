"use client";

import { CourtConnectionsTab } from "./court-connections-tab";
import { EsajCredentialTab } from "./esaj-credential-tab";

/**
 * Aba "Tribunais" unificada: reúne as duas integrações de tribunal do advogado —
 * a CONEXÃO eproc (ler os autos, em cima) e a CREDENCIAL e-SAJ (protocolar peças,
 * embaixo). Cada uma é independente e tem seu próprio status.
 */
export function TribunaisTab() {
  return (
    <div className="max-w-4xl">
      <div className="mt-7">
        <CourtConnectionsTab />
      </div>
      {/* EsajCredentialTab traz seu próprio mt-7/max-w — serve de separador. */}
      <EsajCredentialTab />
    </div>
  );
}
