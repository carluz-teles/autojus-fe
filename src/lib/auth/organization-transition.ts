"use client";

type Transition = {
  generation: number;
  organizationId: string | null;
  blocked: boolean;
};

export function selectOrganizationTarget(
  membershipIds: string[],
  activeId: string | null,
  invitationId: string | null,
) {
  if (invitationId)
    return membershipIds.includes(invitationId) ? invitationId : null;
  if (activeId && membershipIds.includes(activeId)) return activeId;
  return membershipIds.length === 1 ? membershipIds[0] : null;
}

export async function activateAndVerifyOrganization<
  T extends { clerk_org_id: string; user_id: string },
>(
  targetId: string,
  expectedUserId: string,
  setActive: (id: string) => Promise<void>,
  freshToken: (id: string) => Promise<string | null | undefined>,
  getIdentity: (token: string) => Promise<T>,
): Promise<T> {
  await setActive(targetId);
  const token = await freshToken(targetId);
  if (!token)
    throw new Error("A sessão não retornou um token para este escritório.");
  const me = await getIdentity(token);
  if (me.clerk_org_id !== targetId || me.user_id !== expectedUserId)
    throw new Error("Não foi possível confirmar o escritório selecionado.");
  return me;
}

let state: Transition = { generation: 0, organizationId: null, blocked: true };
const listeners = new Set<() => void>();
const requests = new Set<AbortController>();

export function transitionSnapshot() {
  return state;
}

export function subscribeTransition(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: Transition) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function beginOrganizationTransition() {
  requests.forEach((controller) => controller.abort());
  requests.clear();
  publish({
    generation: state.generation + 1,
    organizationId: null,
    blocked: true,
  });
  return state.generation;
}

export function verifyOrganizationTransition(
  generation: number,
  organizationId: string,
) {
  if (state.generation !== generation) return false;
  publish({ generation, organizationId, blocked: false });
  return true;
}

export function isCurrentOrganizationRequest(
  generation: number,
  organizationId: string | null,
) {
  return (
    !state.blocked &&
    state.generation === generation &&
    state.organizationId === organizationId
  );
}

export function registerOrganizationRequest(controller: AbortController) {
  requests.add(controller);
  return () => requests.delete(controller);
}
