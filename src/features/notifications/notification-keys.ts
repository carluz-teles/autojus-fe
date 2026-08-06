// Query keys da feature de notificações — fonte única para os hooks (3a) e para a
// invalidação disparada pelo stream SSE (3b). Manter tudo sob `all` deixa o push
// invalidar lista + badge de uma vez.
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: { unread?: boolean } = {}) =>
    [...notificationKeys.all, "list", params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};
