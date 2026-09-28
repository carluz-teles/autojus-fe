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

/**
 * Nome do sistema como o tribunal o escreve. O mapa existe só pra CAPITALIZAÇÃO da
 * marca ("EPROC" → "eproc", "ESAJ" → "e-SAJ"); o conjunto fechado vive em
 * internal/court/catalog.go (hoje EPROC e ESAJ, nada mais).
 *
 * O fallback devolve o código cru DE PROPÓSITO e não é enum vazando: esses valores
 * são siglas de marca, então um sistema novo ("PJE") já chega legível — inventar um
 * rótulo pt-BR pra ele seria pior (batizaríamos o produto de outra empresa). O que
 * NÃO se aceita é grafia errada, por isso cada sistema suportado tem entrada aqui.
 */
export function courtSystemName(system: string) {
  return { EPROC: "eproc", ESAJ: "e-SAJ" }[system] ?? system;
}

/**
 * O único caminho pra frente é capturar o segundo fator (o QR/código): não há seed
 * selado no BE pra reusar, então reconectar sozinho não resolve. Fonte única dos
 * dois status que significam isso — o wizard e o botão "Reconectar" decidem pelo
 * mesmo predicado (antes cada um repetia a comparação).
 */
export function precisaSegundoFator(
  status: CourtConnectionStatus | null | undefined,
): boolean {
  return status === "MFA_REQUIRED" || status === "MFA_ENROLLMENT_REQUIRED";
}

/**
 * A conexão existe mas não está servindo — tem o que reconectar. CONNECTED não tem
 * (e o card já oferece "Testar conexão"), AUTHENTICATING está em curso (a lista
 * repolla). Todo o resto — DISCONNECTED, ERROR, REAUTH_REQUIRED,
 * CERTIFICATE_REQUIRED e os MFA_* — tem saída pela UI sem remover e recriar.
 */
export function podeReconectar(
  status: CourtConnectionStatus | null | undefined,
): boolean {
  return !!status && status !== "CONNECTED" && status !== "AUTHENTICATING";
}

function courtName(entry: CourtCatalogEntry) {
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
