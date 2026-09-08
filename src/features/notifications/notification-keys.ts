// User + organization scope prevents one account's inbox/preferences flashing
// during an organization switch. The prefix allows SSE to invalidate active data.
export const notificationKeys = {
  all: ["notifications"] as const,
  scope: (
    orgId: string | null | undefined,
    userId: string | null | undefined,
  ) => ["notifications", orgId, userId] as const,
};
