"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Form do modal "Editar dados" do Perfil — só o NOME (Clerk headless
// user.update). E-mail/senha/foto/sessões não passam por aqui: e-mail é
// verificado (fluxo à parte), senha e sessões são cards inline na página.

// Nome obrigatório (o Clerk exige firstName não-vazio no user.update); sobrenome
// é opcional. Validação declarada uma vez, aqui, via zod — o componente só liga.
const schema = z.object({
  firstName: z.string().trim().min(1, "Informe seu nome."),
  lastName: z.string().trim(),
});

export type PerfilEditForm = z.infer<typeof schema>;

export function usePerfilEditForm({ onDone }: { onDone: () => void }) {
  const { user } = useUser();

  const form = useForm<PerfilEditForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "" },
  });
  const { handleSubmit, reset, formState } = form;

  // Repopula ao abrir/mudar de usuário — evita salvar em cima de campos vazios.
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      });
    }
  }, [user, reset]);

  const salvar = handleSubmit(async (values) => {
    if (!user) return;
    try {
      await user.update({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
      toast.success("Dados atualizados.");
      onDone();
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    }
  });

  return {
    form,
    salvar,
    salvando: formState.isSubmitting,
  };
}
