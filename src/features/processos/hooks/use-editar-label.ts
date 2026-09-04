"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

import type { ProcessoView } from "../types";
import { useUpdateProcessoManual } from "./use-processos";

// ── Zod: fonte da validação client-side (mesmo padrão de use-confirmar-prazo-form) ──
const schema = z.object({
  label: z.string().trim().max(255, "Máximo de 255 caracteres."),
});

export type LabelFormValues = z.infer<typeof schema>;

/**
 * Form de edição do apelido manual do processo (label) — PATCH /v1/processos/:id
 * {label}. Reusa useUpdateProcessoManual, o mesmo mutation hook já usado por
 * phase/claim_value no cockpit (mesmo endpoint, mesmo contrato PATCH parcial).
 *
 * `label` vazio (campo apagado + salvo) limpa o override no BE e o título volta
 * ao fallback automático (réu+CNJ ou classe·assunto) — contrato do BE, replicado
 * aqui sem validação de min (string vazia é um valor válido, não um erro).
 *
 * A edição é sob demanda (toggle `editando`): o form só existe montado enquanto
 * o usuário está editando, sempre repopulado a partir do `label` atual do
 * ProcessoView (evita editar em cima de um valor stale após navegação).
 */
export function useEditarLabel(processo: ProcessoView) {
  const [editando, setEditando] = useState(false);
  const mutation = useUpdateProcessoManual(processo.id);

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: processo.label ?? "" },
  });

  // Repopula o form se o label mudar por baixo (ex.: outra aba/usuário) enquanto
  // fechado — nunca pisa em cima de uma edição em andamento.
  useEffect(() => {
    if (!editando) form.reset({ label: processo.label ?? "" });
  }, [processo.label, editando, form]);

  function abrir() {
    form.reset({ label: processo.label ?? "" });
    setEditando(true);
  }

  function cancelar() {
    form.reset({ label: processo.label ?? "" });
    setEditando(false);
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ label: values.label });
      toast.success(
        values.label
          ? "Apelido salvo."
          : "Apelido removido — o título voltou ao padrão automático.",
      );
      setEditando(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o apelido. Tente novamente.",
      );
    }
  });

  return {
    editando,
    abrir,
    cancelar,
    submit,
    register: form.register,
    errors: form.formState.errors,
    isSaving: mutation.isPending,
  };
}
