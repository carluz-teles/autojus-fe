"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { onboardingCopy } from "@/features/onboarding/copy";
import { lookupCnpj } from "@/features/onboarding/services/onboarding.service";
import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";
import {
  EMPTY_ADDRESS,
  makeOrgProfileSchema,
  type OrgProfileFormValues,
  orgProfileToInput,
} from "@/lib/forms/org-profile";
import { maskCep, maskCnpj, maskPhone } from "@/lib/masks";

import type { OrgProfileView } from "../types";
import { useOrgProfile } from "./use-org-profile";

const t = onboardingCopy.company;

// Schema/mensagens são as MESMAS do passo "Sua empresa" do onboarding (fonte
// única em lib/forms/org-profile) — aqui só muda o alvo da escrita: um perfil que
// já existe, não a criação da org.
const schema = makeOrgProfileSchema({
  nameRequired: t.fields.name.required,
  cnpjRequired: t.fields.cnpj.required,
  phoneInvalid: t.fields.phone.invalid,
  emailInvalid: t.fields.email.invalid,
  cidadeRequired: t.fields.address.cidade.required,
  ufInvalid: t.fields.address.uf.invalid,
});

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function toFormValues(profile: OrgProfileView): OrgProfileFormValues {
  return {
    trade_name: profile.trade_name,
    cnpj: maskCnpj(profile.cnpj),
    phone: profile.phone ? maskPhone(profile.phone) : "",
    email: profile.email ?? "",
    legal_name: profile.legal_name,
    address: profile.address
      ? {
          cep: maskCep(profile.address.cep),
          logradouro: profile.address.logradouro,
          numero: profile.address.numero ?? "",
          complemento: profile.address.complemento ?? "",
          bairro: profile.address.bairro ?? "",
          cidade: profile.address.cidade,
          uf: profile.address.uf,
        }
      : { ...EMPTY_ADDRESS },
  };
}

/**
 * Form de edição do perfil do escritório na aba Organização (Configurações).
 * Reusa o schema/máscaras/lookup do onboarding (não duplica validação) — só troca
 * o "quando": aqui o perfil já existe, então os campos partem preenchidos (GET via
 * useOrgProfile) e o submit é sempre um PUT de atualização.
 */
export function useOrgProfileEditForm({ onDone }: { onDone: () => void }) {
  const fetcher = useApi();
  const { profile, isProfileLoading, updateProfile, isSaving } =
    useOrgProfile();

  const form = useForm<OrgProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trade_name: "",
      cnpj: "",
      phone: "",
      email: "",
      legal_name: "",
      address: { ...EMPTY_ADDRESS },
    },
  });
  const { register, handleSubmit, setValue, getValues, formState, reset } =
    form;

  // Repopula o form assim que o GET chega (ou muda) — evita editar em cima de
  // defaults vazios enquanto a leitura ainda está pendente.
  useEffect(() => {
    if (profile) reset(toFormValues(profile));
  }, [profile, reset]);

  const cnpjLookup = useMutation({
    mutationFn: (value: string) => lookupCnpj(fetcher, value),
  });

  const onCnpjBlur = async () => {
    const cnpj = onlyDigits(getValues("cnpj"));
    if (cnpj.length !== 14) return;
    try {
      const data = await cnpjLookup.mutateAsync(cnpj);
      const opts = { shouldValidate: formState.isSubmitted };
      setValue("trade_name", data.trade_name || data.legal_name, opts);
      setValue("legal_name", data.legal_name, opts);
    } catch {
      // cnpjLookup.isError cobre o aviso na UI
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      await updateProfile(orgProfileToInput(values));
      toast.success("Dados do escritório atualizados.");
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar. Tente novamente.",
      );
    }
  });

  return {
    register,
    submit,
    errors: formState.errors,
    onCnpjBlur,
    isCnpjLoading: cnpjLookup.isPending,
    cnpjLookupFailed: cnpjLookup.isError,
    isProfileLoading,
    isSaving,
  };
}
