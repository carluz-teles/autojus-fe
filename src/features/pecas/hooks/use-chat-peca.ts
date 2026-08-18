"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getChat, sendChat } from "../services/pecas.service";
import type { PecaChatMessage, PecaChatThread } from "../types";

// ── Chave de query do chat ────────────────────────────────────────────────────
function chatKey(pecaId: string) {
  return ["pecas", "chat", pecaId] as const;
}

// ── Thread (GET) ──────────────────────────────────────────────────────────────

/**
 * Carrega e mantém o histórico do chat da peça.
 * GET /v1/pecas/:id/chat — carregado ao montar, não há polling (é append-only
 * via mutation que atualiza o cache diretamente).
 */
export function useChatThread(pecaId: string): {
  thread: PecaChatThread | null;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: chatKey(pecaId),
    queryFn: async () => {
      const res = await getChat(fetcher, pecaId);
      return res.data;
    },
    staleTime: Infinity, // append-only: só a mutation modifica, sem refetch
  });

  return {
    thread: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}

// ── Enviar pergunta (POST) ────────────────────────────────────────────────────

/**
 * Mutation para enviar uma pergunta ao assistente IA grounded.
 * POST /v1/pecas/:id/chat → PecaChatMessage (assistant).
 * Ao receber a resposta, a mensagem do usuário (otimista) e a resposta do
 * assistente são adicionadas ao cache local — sem refetch do GET.
 *
 * 422 INVALID → isLlmUnavailable=true (IA não configurada).
 */
export function useSendChat(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    PecaChatMessage,
    Error,
    string // question
  >({
    mutationFn: async (question) => {
      const res = await sendChat(fetcher, pecaId, { question });
      return res.data;
    },
    onSuccess: (assistantMsg, question) => {
      // Constrói a mensagem do usuário como espelho do que o BE persiste.
      const userMsg: PecaChatMessage = {
        id: `optimistic-user-${Date.now()}`,
        draft_id: pecaId,
        role: "user",
        content: question,
        citations: [],
        grounded: false,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        chatKey(pecaId),
        (old: PecaChatThread | undefined) => {
          if (!old) {
            // Cache vazio: inicializa com grounded_capable=false como fallback seguro.
            // O GET /chat será a fonte autoritativa na próxima montagem.
            return {
              messages: [userMsg, assistantMsg],
              grounded_capable: false,
            };
          }
          // IMPORTANTE: preserve old.grounded_capable — é a capability do thread
          // (determinada pelo BE no GET /chat), não o flag por-mensagem.
          // Sobrescrever com assistantMsg.grounded corromperia o cache: um turno
          // sem grounding (grounded=false) tornaria o banner permanente.
          return {
            ...old,
            messages: [...old.messages, userMsg, assistantMsg],
          };
        },
      );
    },
  });

  return {
    sendMessage: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
    /** Pergunta que está pendente/falhou — para reenvio. */
    lastQuestion: mutation.variables ?? null,
  };
}
