"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "./services";
import type { Peca, Prazo, Tarefa } from "./types";

export const keys = {
  intimacoes: ["intimacoes"] as const,
  intimacao: (id: string) => ["intimacoes", id] as const,
  tarefas: ["tarefas"] as const,
  tarefa: (id: string) => ["tarefas", id] as const,
  processos: ["processos"] as const,
  processo: (n: string) => ["processos", n] as const,
  pecas: ["pecas"] as const,
  peca: (id: string) => ["pecas", id] as const,
  contatos: ["contatos"] as const,
};

/**
 * Fonte única: qualquer mutação invalida intimações E tarefas, porque
 * providência é tarefa — status editado num lugar aparece igual no outro.
 */
function useInvalidarTudo() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.intimacoes });
    qc.invalidateQueries({ queryKey: keys.tarefas });
    qc.invalidateQueries({ queryKey: keys.pecas });
  };
}

export const useIntimacoes = () =>
  useQuery({ queryKey: keys.intimacoes, queryFn: api.listIntimacoes });

export const useIntimacao = (id: string) =>
  useQuery({ queryKey: keys.intimacao(id), queryFn: () => api.getIntimacao(id) });

export function useUpdatePrazo(intimacaoId: string) {
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: (prazo: Prazo) => api.updatePrazo(intimacaoId, prazo),
    onSuccess: invalidar,
  });
}

export const useTarefas = () =>
  useQuery({ queryKey: keys.tarefas, queryFn: api.listTarefas });

export const useTarefa = (id: string) =>
  useQuery({ queryKey: keys.tarefa(id), queryFn: () => api.getTarefa(id) });

export function useUpdateTarefa(id: string) {
  const qc = useQueryClient();
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateTarefa>[1]) =>
      api.updateTarefa(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tarefa(id) });
      invalidar();
    },
  });
}

export function useAddComentario(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) => api.addComentario(id, texto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.tarefa(id) }),
  });
}

export const useProcessos = () =>
  useQuery({ queryKey: keys.processos, queryFn: api.listProcessos });

export const useProcesso = (numero: string) =>
  useQuery({
    queryKey: keys.processo(numero),
    queryFn: () => api.getProcesso(numero),
  });

export const usePecas = () =>
  useQuery({ queryKey: keys.pecas, queryFn: api.listPecas });

export const usePeca = (id: string) =>
  useQuery({ queryKey: keys.peca(id), queryFn: () => api.getPeca(id) });

export function useUpdatePecaStatus(id: string) {
  const qc = useQueryClient();
  const invalidar = useInvalidarTudo();
  return useMutation({
    mutationFn: ({
      status,
      protocolo,
    }: {
      status: Peca["status"];
      protocolo?: string;
    }) => api.updatePecaStatus(id, status, protocolo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.peca(id) });
      invalidar();
    },
  });
}

export const useContatos = () =>
  useQuery({ queryKey: keys.contatos, queryFn: api.listContatos });

export type { Tarefa };
