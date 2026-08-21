"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  EMPTY_ADDRESS,
  makeOrgProfileSchema,
  type OrgProfileFormValues,
  orgProfileToInput,
} from "@/lib/forms/org-profile";
import { maskCep } from "@/lib/masks";

import { onboardingCopy } from "../copy";
import type { OrgProfileInput } from "../types";
import { useOnboarding } from "./use-onboarding";

const t = onboardingCopy.company;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

// Schema/mapeamento compartilhados com a página /organization (fonte única em
// lib/forms/org-profile) — aqui só injetamos as mensagens do onboarding.
const schema = makeOrgProfileSchema({
  nameRequired: t.fields.name.required,
  cnpjInvalid: t.fields.cnpj.invalid,
  phoneInvalid: t.fields.phone.invalid,
  emailInvalid: t.fields.email.invalid,
  cidadeRequired: t.fields.address.cidade.required,
  ufInvalid: t.fields.address.uf.invalid,
});

export type CompanyFormValues = OrgProfileFormValues;

// Máquina de estados do passo da empresa: cria a org no Clerk (+ logo staged) →
// aguarda o BE provisionar o tenant (poll /identity/me) → grava o perfil.
type Phase = "idle" | "creating" | "provisioning" | "saving";

/**
 * Passo da empresa. Concentra toda a lógica: RHF + Zod, autofetch de CNPJ/CEP,
 * logo staged (sobe DEPOIS que a org existe), endereço opcional revelável, criação
 * da Clerk Organization e a espera pelo tenant provisionado antes do PUT.
 */
export function useCompanyForm({ onDone }: { onDone: () => void }) {
  const { isLoaded, createOrganization, setActive } = useOrganizationList();
  const { organization: activeOrg } = useOrganization();
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
  const [showAddress, setShowAddress] = useState(false);

  // Logo staged: preview local via object URL; o upload real acontece no submit,
  // DEPOIS de a org existir (organization.setLogo exige a org criada).
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    },
    [],
  );

  const selectLogo = (file: File) => {
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    const url = URL.createObjectURL(file);
    logoUrlRef.current = url;
    setPendingLogo(file);
    setLogoPreview(url);
  };

  const form = useForm<CompanyFormValues>({
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
  const { register, handleSubmit, setValue, getValues, formState } = form;

  // Autofetch por CNPJ (blur com 14 dígitos): pré-preenche nome/razão e, quando o
  // registro traz endereço, REVELA a seção já preenchida (valor visível > seção
  // escondida). Estado (isPending/isError) é do React Query.
  const onCnpjBlur = async () => {
    const cnpj = onlyDigits(getValues("cnpj"));
    if (cnpj.length !== 14) return;
    try {
      const data = await lookupCnpj(cnpj);
      const opts = { shouldValidate: formState.isSubmitted };
      setValue("trade_name", data.trade_name || data.legal_name, opts);
      setValue("legal_name", data.legal_name, opts);
      const hasAddress = Object.values(data.address ?? {}).some(
        (v) => (v ?? "").toString().trim() !== "",
      );
      if (hasAddress) {
        setShowAddress(true);
        setValue("address.cep", maskCep(data.address.cep), opts);
        setValue("address.logradouro", data.address.logradouro, opts);
        setValue("address.numero", data.address.numero ?? "", opts);
        setValue("address.complemento", data.address.complemento ?? "", opts);
        setValue("address.bairro", data.address.bairro ?? "", opts);
        setValue("address.cidade", data.address.cidade, opts);
        setValue("address.uf", data.address.uf, opts);
      }
    } catch {
      // cnpjLookupFailed (isError da mutation) cobre o aviso na UI
    }
  };

  // Autofetch por CEP (blur com 8 dígitos): completa o endereço; spinner no campo
  // e campos-alvo desabilitados enquanto busca. Falha degrada em silêncio.
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

  const removeAddress = () => {
    setValue("address", { ...EMPTY_ADDRESS }, { shouldValidate: true });
    setShowAddress(false);
  };

  // Sobe o logo staged na org (best-effort: logo é cosmético — falha não trava o
  // onboarding; dá para reenviar depois em Organização).
  const uploadLogo = async (org: {
    setLogo: (p: { file: File }) => Promise<unknown>;
  }) => {
    if (!pendingLogo) return;
    try {
      await org.setLogo({ file: pendingLogo });
      setPendingLogo(null);
    } catch {
      // segue o fluxo — o logo pode ser enviado depois
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

    // Org já provisionada (ex.: usuário voltou ao passo) → logo + perfil direto.
    if (tenantReady) {
      if (activeOrg) await uploadLogo(activeOrg);
      persistProfile(orgProfileToInput(values));
      return;
    }

    if (!isLoaded || !createOrganization || !setActive) return;
    setPhase("creating");
    try {
      const org = await createOrganization({ name: values.trade_name.trim() });
      await uploadLogo(org);
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

  // Tenant provisionado durante o "provisioning" → grava o perfil e avança.
  useEffect(() => {
    if (phase !== "provisioning" || !tenantReady) return;
    updateOrgProfile(orgProfileToInput(getValues()))
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
    showAddress,
    openAddress: () => setShowAddress(true),
    removeAddress,
    logoPreview,
    selectLogo,
  };
}
