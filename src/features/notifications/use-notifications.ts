"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useApi } from "@/lib/api/use-api";

import { notificationKeys } from "./notification-keys";
import type {
  DataEnvelope,
  NotificationPreference,
  NotificationTypeDefinition,
  NotificationView,
  PageEnvelope,
} from "./types";

function useNotificationScope() {
  const { orgId, userId, isSignedIn } = useAuth();
  return {
    key: notificationKeys.scope(orgId, userId),
    enabled: Boolean(isSignedIn && orgId),
  };
}

export function useUnreadNotifications() {
  const api = useApi();
  const scope = useNotificationScope();
  return useQuery({
    queryKey: [...scope.key, "unread-count"],
    queryFn: ({ signal }) =>
      api<{ count: number }>("/v1/notifications/unread-count", { signal }),
    enabled: scope.enabled,
    refetchInterval: 60_000,
  });
}

export function useNotifications(unread: boolean) {
  const api = useApi();
  const scope = useNotificationScope();
  return useInfiniteQuery({
    queryKey: [...scope.key, "list", { unread }],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<PageEnvelope<NotificationView>>("/v1/notifications", {
        signal,
        query: { limit: 25, unread: unread || undefined, cursor: pageParam },
      }),
    getNextPageParam: (page) => page.page.next_cursor ?? undefined,
    enabled: scope.enabled,
  });
}

export function useMarkNotificationRead() {
  const api = useApi();
  const queryClient = useQueryClient();
  const scope = useNotificationScope();
  return useMutation({
    mutationFn: (id: string | null) =>
      api<void>(
        id ? `/v1/notifications/${id}/read` : "/v1/notifications/read-all",
        { method: "POST" },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scope.key }),
    onError: () =>
      toast.error("Não foi possível marcar a notificação como lida."),
  });
}

export function useNotificationPreferences() {
  const api = useApi();
  const queryClient = useQueryClient();
  const scope = useNotificationScope();
  const types = useQuery({
    queryKey: [...scope.key, "types"],
    queryFn: ({ signal }) =>
      api<DataEnvelope<NotificationTypeDefinition>>("/v1/notifications/types", {
        signal,
      }),
    enabled: scope.enabled,
    staleTime: 5 * 60_000,
  });
  const preferences = useQuery({
    queryKey: [...scope.key, "preferences"],
    queryFn: ({ signal }) =>
      api<DataEnvelope<NotificationPreference>>(
        "/v1/notifications/preferences",
        { signal },
      ),
    enabled: scope.enabled,
  });
  const save = useMutation({
    mutationFn: (preference: NotificationPreference) =>
      api<NotificationPreference>("/v1/notifications/preferences", {
        method: "PUT",
        body: preference,
      }),
    onSuccess: (preference) => {
      queryClient.setQueryData<DataEnvelope<NotificationPreference>>(
        [...scope.key, "preferences"],
        (previous) => ({
          data: [
            ...(previous?.data ?? []).filter(
              (item) => item.type !== preference.type,
            ),
            preference,
          ],
        }),
      );
      toast.success("Preferências atualizadas.");
    },
    onError: () =>
      toast.error(
        "Não foi possível salvar. Sua preferência anterior foi mantida.",
      ),
  });
  return { types, preferences, save };
}
