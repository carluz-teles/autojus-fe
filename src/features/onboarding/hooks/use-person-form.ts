"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  first_name: z.string().trim().min(1, "Informe seu nome."),
  last_name: z.string().trim().min(1, "Informe seu sobrenome."),
  phone: z.string().trim().optional(),
});

export type PersonFormValues = z.infer<typeof schema>;

/**
 * Passo 1 (dados pessoais). Toda a lógica vive aqui: RHF + Zod e a escrita no
 * Clerk. O componente só amarra o JSX aos valores/handlers.
 */
export function usePersonForm({ onDone }: { onDone: () => void }) {
  const { user, isLoaded } = useUser();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", phone: "" },
  });
  const { register, handleSubmit, reset, formState } = form;

  // Pré-preenche com o que já existe no Clerk quando o usuário carrega (sem
  // sobrescrever edições em andamento).
  useEffect(() => {
    if (!isLoaded || !user || formState.isDirty) return;
    reset({
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
      phone: (user.unsafeMetadata?.phone as string | undefined) ?? "",
    });
  }, [isLoaded, user, reset, formState.isDirty]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    if (!user) return;
    try {
      // Nomes não exigem verificação — vão direto no perfil.
      await user.update({
        firstName: values.first_name,
        lastName: values.last_name,
      });
      const phone = values.phone?.trim();
      if (phone) {
        // TODO(v0): telefone fica só em unsafeMetadata. Reconciliar com o webhook
        // do BE que lê phone_numbers (número verificado) quando o fluxo existir.
        await user.updateMetadata({ unsafeMetadata: { phone } });
      }
      onDone();
    } catch {
      setSubmitError(
        "Não foi possível salvar seus dados. Tente novamente em instantes.",
      );
    }
  });

  return {
    register,
    submit,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    isReady: isLoaded,
    submitError,
  };
}
