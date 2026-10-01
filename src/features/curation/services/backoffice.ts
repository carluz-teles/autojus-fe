import type { ApiFetcher } from "@/lib/api/use-api";

export interface BackofficeSession {
  organization_id: string;
  tenant_id: string;
  user_id: string;
  revision: number;
  capabilities: string[];
  requires_organization_switch: boolean;
}

export async function getBackofficeSession(
  api: ApiFetcher,
  signal?: AbortSignal,
) {
  const response = await api<{ data: BackofficeSession }>(
    "/v1/backoffice/session",
    { signal },
  );
  return response.data;
}

export function sessionMatchesOrganization(
  session: BackofficeSession | undefined,
  organizationId: string | null | undefined,
) {
  return Boolean(
    session &&
    organizationId &&
    session.organization_id === organizationId &&
    !session.requires_organization_switch &&
    session.capabilities.length > 0,
  );
}
