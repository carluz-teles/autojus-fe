import { useAuth } from "@clerk/nextjs";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getDocumentTemplateDefault,
  listDocumentTemplates,
  setDocumentTemplateDefault,
} from "../../services/document-templates.service";

export function useTemplateData() {
  const { orgId } = useAuth();
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const listKey = ["document-templates", orgId];
  const defaultKey = ["document-template-default", orgId];

  const list = useInfiniteQuery({
    queryKey: listKey,
    enabled: !!orgId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      listDocumentTemplates(fetcher, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor ?? undefined,
  });
  const selectedDefault = useQuery({
    queryKey: defaultKey,
    enabled: !!orgId,
    queryFn: ({ signal }) => getDocumentTemplateDefault(fetcher, signal),
  });
  const chooseDefault = useMutation({
    mutationFn: (versionId: string) =>
      setDocumentTemplateDefault(fetcher, versionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: defaultKey }),
        queryClient.invalidateQueries({ queryKey: listKey }),
      ]);
    },
  });
  const templates = list.data?.pages.flatMap((page) => page.data) ?? [];
  const rows = templates.map((template) => {
    const latest = template.latest_version;
    const isDefault = selectedDefault.data?.template_id === template.id;
    return {
      ...template,
      isDefault,
      defaultIsLatest:
        isDefault && selectedDefault.data?.version_id === latest?.id,
      canSetDefault:
        !template.archived &&
        latest?.status === "READY" &&
        selectedDefault.data?.version_id !== latest.id,
      statusLabel: template.archived
        ? "Arquivado"
        : latest?.status === "READY"
          ? "Pronto"
          : latest?.status === "FAILED"
            ? "Falhou"
            : latest
              ? "Em validação"
              : "Sem versão",
      statusTone: (template.archived
        ? "neutral"
        : latest?.status === "READY"
          ? "success"
          : latest?.status === "FAILED"
            ? "danger"
            : "warning") as "neutral" | "success" | "danger" | "warning",
    };
  });

  function selectDefault(event: React.MouseEvent<HTMLButtonElement>) {
    const versionId = event.currentTarget.dataset.versionId;
    if (versionId && !chooseDefault.isPending) chooseDefault.mutate(versionId);
  }

  function loadMore() {
    if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
  }

  function retry() {
    void Promise.all([list.refetch(), selectedDefault.refetch()]);
  }

  return {
    orgId,
    rows,
    defaultTemplate: selectedDefault.data ?? null,
    list,
    selectedDefault,
    chooseDefault,
    selectDefault,
    loadMore,
    retry,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listKey }),
        queryClient.invalidateQueries({ queryKey: defaultKey }),
      ]),
  };
}
