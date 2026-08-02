"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.step1;

const schema = z.object({
  first_name: z.string().trim().min(1, t.fields.firstName.required),
  last_name: z.string().trim().min(1, t.fields.lastName.required),
});

export type PersonFormValues = z.infer<typeof schema>;

/**
 * Passo 1 (seus dados). Toda a lógica vive aqui: RHF + Zod, e a escrita no Clerk
 * — nome E foto — acontece de uma vez no "Continuar". A foto escolhida fica
 * staged localmente (preview via object URL) até o submit; nada sobe antes.
 * Telefone NÃO pertence a este passo — é da empresa (passo 2).
 */
export function usePersonForm({ onDone }: { onDone: () => void }) {
  const { user, isLoaded } = useUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "" },
  });
  const { register, handleSubmit, reset, formState } = form;

  // Pré-preenche com o que já existe no Clerk quando o usuário carrega (sem
  // sobrescrever edições em andamento).
  useEffect(() => {
    if (!isLoaded || !user || formState.isDirty) return;
    reset({
      first_name: user.firstName ?? "",
      last_name: user.lastName ?? "",
    });
  }, [isLoaded, user, reset, formState.isDirty]);

  // Revoga o object URL anterior a cada troca e no unmount (sem vazar blobs).
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  // Escolher a foto só faz o stage + preview local; o upload real é no submit.
  const selectPhoto = (file: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPendingPhoto(file);
    setPreviewUrl(url);
  };

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    if (!user) return;
    try {
      // Nomes não exigem verificação — vão direto no perfil.
      await user.update({
        firstName: values.first_name,
        lastName: values.last_name,
      });
      if (pendingPhoto) {
        await user.setProfileImage({ file: pendingPhoto });
        setPendingPhoto(null);
      }
      onDone();
    } catch {
      setSubmitError(pendingPhoto ? t.photo.error : t.submitError);
    }
  });

  return {
    register,
    submit,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    isReady: isLoaded,
    submitError,
    // Preview staged vence; senão a imagem real do Clerk (hasImage separa o
    // placeholder default); senão null → a UI mostra o ícone.
    photoUrl: previewUrl ?? (user?.hasImage ? user.imageUrl : null),
    selectPhoto,
  };
}
