"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { maskCep } from "@/lib/masks";

import { onboardingCopy } from "../copy";
import type { OrgProfileInput } from "../types";
import { useOnboarding } from "./use-onboarding";

const t = onboardingCopy.company;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const schema = z.object({
  cnpj: z
    .string()
    .refine((v) => onlyDigits(v).length === 14, t.fields.cnpj.invalid),
  // Telefone do escritório — opcional; quando preenchido, 10-11 dígitos (fixo/celular).
  phone: z
    .string()
    .refine((v) => {
      const d = onlyDigits(v);
      return d.length === 0 || d.length === 10 || d.length === 11;
    }, t.fields.phone.invalid)
    .optional(),
  legal_name: z.string().trim().min(1, t.fields.legalName.required),
  trade_name: z.string().trim().min(1, t.fields.tradeName.required),
  address: z.object({
    cep: z
      .string()
      .refine((v) => onlyDigits(v).length === 8, t.fields.address.cep.invalid),
    logradouro: z.string().trim().min(1, t.fields.address.logradouro.required),
    numero: z.string().trim().optional(),
    complemento: z.string().trim().optional(),
    bairro: z.string().trim().optional(),
    cidade: z.string().trim().min(1, t.fields.address.cidade.required),
    uf: z.string().trim().length(2, t.fields.address.uf.invalid),
  }),
});

export type CompanyFormValues = z.infer<typeof schema>;

// Máquina de estados do passo da empresa: cria a org no Clerk → aguarda o BE
// provisionar o tenant (poll /identity/me) → grava o perfil. Enquanto ≠ "idle",
// mostramos "preparando sua conta…".
type Phase = "idle" | "creating" | "provisioning" | "saving";

/**
 * Passo da empresa. Concentra toda a lógica: RHF + Zod, autofetch de CNPJ/CEP,
 * criação da Clerk Organization e a espera pelo tenant provisionado antes do PUT.
 */
export function useCompanyForm({ onDone }: { onDone: () => void }) {
  const { isLoaded, createOrganization, setActive } = useOrganizationList();
  const [phase, setPhase] = useState<Phase>("idle");
  const {
    tenantReady,
    updateOrgProfile,
    profileError,
    lookupCnpj,
    isCnpjLoading,
    cnpjLookupFailed,
    lookupCep,
    isCepLoading,
  } = useOnboarding({ poll: phase === "provisioning" });

  const [orgError, setOrgError] = useState<string | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cnpj: "",
      phone: "",
      legal_name: "",
      trade_name: "",
      address: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
      },
    },
  });
  const { register, handleSubmit, setValue, getValues, formState } = form;

  const toInput = (values: CompanyFormValues): OrgProfileInput => ({
    cnpj: onlyDigits(values.cnpj),
    phone: onlyDigits(values.phone ?? "") || undefined,
    legal_name: values.legal_name.trim(),
    trade_name: values.trade_name.trim(),
    address: {
      cep: onlyDigits(values.address.cep),
      logradouro: values.address.logradouro.trim(),
      numero: values.address.numero?.trim() || undefined,
      complemento: values.address.complemento?.trim() || undefined,
      bairro: values.address.bairro?.trim() || undefined,
      cidade: values.address.cidade.trim(),
      uf: values.address.uf.trim().toUpperCase(),
    },
  });

  // Autofetch por CNPJ (blur com 14 dígitos): pré-preenche os campos. O estado
  // (isPending/isError) é do React Query — aqui só o efeito de preencher o form.
  // Falha degrada: tudo continua editável e `lookupFailed` mostra o aviso.
  const onCnpjBlur = async () => {
    const cnpj = onlyDigits(getValues("cnpj"));
    if (cnpj.length !== 14) return;
    try {
      const data = await lookupCnpj(cnpj);
      const opts = { shouldValidate: formState.isSubmitted };
      setValue("legal_name", data.legal_name, opts);
      setValue("trade_name", data.trade_name, opts);
      setValue("address.cep", maskCep(data.address.cep), opts);
      setValue("address.logradouro", data.address.logradouro, opts);
      setValue("address.numero", data.address.numero ?? "", opts);
      setValue("address.complemento", data.address.complemento ?? "", opts);
      setValue("address.bairro", data.address.bairro ?? "", opts);
      setValue("address.cidade", data.address.cidade, opts);
      setValue("address.uf", data.address.uf, opts);
    } catch {
      // cnpjLookupFailed (isError da mutation) cobre o aviso na UI
    }
  };

  // Autofetch por CEP (blur com 8 dígitos): completa o endereço. Enquanto busca,
  // a UI mostra spinner no campo e DESABILITA os campos que serão preenchidos
  // (o usuário não digita por cima do que o fetch vai sobrescrever). Falha
  // degrada em silêncio — endereço segue editável manualmente.
  const onCepBlur = async () => {
    const cep = onlyDigits(getValues("address.cep"));
    if (cep.length !== 8) return;
    try {
      const data = await lookupCep(cep);
      const opts = { shouldValidate: formState.isSubmitted };
      setValue("address.logradouro", data.street, opts);
      setValue("address.bairro", data.neighborhood, opts);
      setValue("address.cidade", data.city, opts);
      setValue("address.uf", data.state, opts);
    } catch {
      // endereço permanece editável manualmente
    }
  };

  const persistProfile = (input: OrgProfileInput) => {
    setPhase("saving");
    updateOrgProfile(input)
      .then(() => {
        setPhase("idle");
        onDone();
      })
      .catch(() => setPhase("idle")); // erro exposto em profileError
  };

  const submit = handleSubmit(async (values) => {
    setOrgError(null);

    // Org já provisionada (ex.: usuário voltou ao passo) → grava direto.
    if (tenantReady) {
      persistProfile(toInput(values));
      return;
    }

    if (!isLoaded || !createOrganization || !setActive) return;
    setPhase("creating");
    try {
      const org = await createOrganization({ name: values.trade_name.trim() });
      await setActive({ organization: org.id });
      // Liga o polling de /identity/me; o efeito conclui quando o tenant surgir.
      setPhase("provisioning");
    } catch {
      setPhase("idle");
      setOrgError(t.orgError);
    }
  });

  // Teto do provisionamento: se o tenant não surgir em ~40s, para o "Preparando…"
  // e devolve o controle com uma mensagem de retry (em vez de pollar pra sempre).
  useEffect(() => {
    if (phase !== "provisioning") return;
    const timer = setTimeout(() => {
      setPhase("idle");
      setOrgError(t.timeout);
    }, 40_000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Tenant provisionado durante o "provisioning" → grava o perfil e avança. Só
  // faz setState nos callbacks assíncronos; os deps [phase, tenantReady] só
  // mudam uma vez, então não há reentrada.
  useEffect(() => {
    if (phase !== "provisioning" || !tenantReady) return;
    updateOrgProfile(toInput(getValues()))
      .then(() => {
        setPhase("idle");
        onDone();
      })
      .catch(() => setPhase("idle")); // erro exposto em profileError
    // toInput/getValues/updateOrgProfile/onDone são estáveis o bastante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tenantReady]);

  return {
    register,
    submit,
    errors: formState.errors,
    onCnpjBlur,
    onCepBlur,
    isCnpjLoading,
    isCepLoading,
    lookupFailed: cnpjLookupFailed,
    isPreparing: phase !== "idle",
    isReady: isLoaded,
    orgError,
    profileError,
  };
}
