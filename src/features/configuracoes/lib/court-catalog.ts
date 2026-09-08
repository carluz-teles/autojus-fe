import type {
  CourtCatalogEntry,
  CourtConnectionStatus,
  CourtConnectionView,
} from "../types/court-connection";

export const courtConnectionLabels: Record<CourtConnectionStatus, string> = {
  CONNECTED: "Conectado",
  AUTHENTICATING: "Conectando…",
  MFA_ENROLLMENT_REQUIRED: "2FA pendente",
  MFA_REQUIRED: "2FA pendente",
  REAUTH_REQUIRED: "Requer autenticação",
  CERTIFICATE_REQUIRED: "Certificado pendente",
  ERROR: "Falha na conexão",
  DISCONNECTED: "Não conectado",
};

export function courtSystemName(system: string) {
  return { EPROC: "eproc", ESAJ: "e-SAJ" }[system] ?? system;
}

export function courtName(entry: CourtCatalogEntry) {
  return /^TJ[A-Z]{2}$/.test(entry.court)
    ? `Tribunal de Justiça · ${entry.name}`
    : entry.name;
}

export function groupCourtCatalog(entries: CourtCatalogEntry[], search = "") {
  const groups = new Map<
    string,
    { court: string; name: string; systems: CourtCatalogEntry[] }
  >();
  for (const entry of entries) {
    const group = groups.get(entry.court) ?? {
      court: entry.court,
      name: courtName(entry),
      systems: [],
    };
    if (!group.systems.some((system) => system.system === entry.system)) {
      group.systems.push(entry);
    }
    groups.set(entry.court, group);
  }
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const query = normalize(search.trim());
  return [...groups.values()]
    .filter((group) =>
      normalize(
        `${group.court} ${group.name} ${group.systems.map((s) => `${s.system} ${courtSystemName(s.system)}`).join(" ")}`,
      ).includes(query),
    )
    .sort(
      (a, b) =>
        Number(b.systems.some((s) => s.available)) -
        Number(a.systems.some((s) => s.available)),
    )
    .map((group) => ({
      ...group,
      systems: [...group.systems].sort((a, b) =>
        a.system.localeCompare(b.system),
      ),
    }));
}

export function connectionForSystem(
  entry: CourtCatalogEntry,
  connections: CourtConnectionView[],
) {
  // A filing authentication belongs to its operation. A legacy record must
  // never turn that into a claim of a reusable, authenticated court session.
  if (entry.connection_mode === "PER_OPERATION") return undefined;
  const matches = connections.filter(
    (c) => c.court === entry.court && c.system === entry.system,
  );
  return matches.find((c) => c.status === "CONNECTED") ?? matches[0];
}
