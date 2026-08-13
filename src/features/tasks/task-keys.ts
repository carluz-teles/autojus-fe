// Query keys da feature de tarefas — fonte única para os hooks de leitura e para a
// invalidação disparada pelas mutations (concluir/dispensar). Manter tudo sob `all`
// deixa uma ação invalidar agenda + aba do processo de uma vez. Espelha
// notification-keys.ts.
export const taskKeys = {
  all: ["tasks"] as const,
  agenda: (params: Record<string, unknown> = {}) =>
    [...taskKeys.all, "agenda", params] as const,
  processo: (processoId: string) =>
    [...taskKeys.all, "processo", processoId] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
};
