import type { CertificateView } from "@/features/configuracoes/types/certificado";
import type { CourtConnectionView } from "@/features/configuracoes/types/court-connection";

export function usableCertificates(
  certificates: CertificateView[],
  now = Date.now(),
) {
  return certificates.filter(
    (c) =>
      !c.revoked_at &&
      Date.parse(c.not_before) <= now &&
      Date.parse(c.not_after) > now,
  );
}

/** Sistemas que dão acesso aos autos de um tribunal (eproc e/ou e-SAJ). */
const RELEVANT_SYSTEMS = ["EPROC", "ESAJ"];

export function courtAccess(
  connections: CourtConnectionView[],
  court?: string,
) {
  // O tribunal está acessível quando QUALQUER sistema relevante conecta — o
  // acesso do eproc e o do e-SAJ coexistem (um não substitui o outro).
  const relevant = connections.filter(
    (c) => RELEVANT_SYSTEMS.includes(c.system) && (!court || c.court === court),
  );
  if (relevant.some((c) => c.status === "CONNECTED")) return "connected";
  if (relevant.some((c) => c.status === "ERROR")) return "error";
  if (
    relevant.some((c) =>
      ["MFA_ENROLLMENT_REQUIRED", "MFA_REQUIRED", "REAUTH_REQUIRED"].includes(
        c.status,
      ),
    )
  )
    return "mfa";
  if (relevant.some((c) => c.status === "AUTHENTICATING")) return "connecting";
  return "missing";
}
