"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { maskCep } from "@/lib/masks";

import { onboardingCopy } from "../copy";
import type { Address, OrgProfileInput } from "../types";
import { useOnboarding } from "./use-onboarding";

const t = onboardingCopy.company;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

// Endereço é OPCIONAL como um todo: vazio inteiro passa; qualquer campo
// preenchido exige o núcleo (cep 8 dígitos, logradouro, cidade, uf) — mesma regra
// do BE (Address parcial é 400).
const addressSchema = z
  .object({
    cep: z.string(),
    logradouro: z.string(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string(),
    uf: z.string(),
  })
  .superRefine((a, ctx) => {
    const values = [
      a.cep,
      a.logradouro,
      a.numero,
      a.complemento,
      a.bairro,
      a.cidade,
      a.uf,
    ];
    const touched = values.some((v) => (v ?? "").trim() !== "");
    if (!touched) return;
    if (onlyDigits(a.cep).length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cep"],
        message: t.fields.address.cep.invalid,
      });
    }
    if (!a.logradouro.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["logradouro"],
        message: t.fields.address.logradouro.required,
      });
    }
    if (!a.cidade.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cidade"],
        message: t.fields.address.cidade.required,
      });
    }
    if (a.uf.trim().length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uf"],
        message: t.fields.address.uf.invalid,
      });
    }
  });

const schema = z.object({
  trade_name: z.string().trim().min(1, t.fields.name.required),
  cnpj: z
    .string()
    .refine((v) => onlyDigits(v).length === 14, t.fields.cnpj.invalid),
  // Telefone do escritório — opcional; quando preenchido, 10-11 dígitos.
  phone: z
    .string()
    .refine((v) => {
      const d = onlyDigits(v);
      return d.length === 0 || d.length === 10 || d.length === 11;
    }, t.fields.phone.invalid)
    .optional(),
  // E-mail da organização — opcional; formato validado quando preenchido.
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: t.fields.email.invalid,
    })
    .optional(),
  // Razão social não tem UI: o lookup de CNPJ preenche por baixo (fallback no
  // toInput = nome da empresa). O BE continua exigindo legal_name.
  legal_name: z.string().optional(),
  address: addressSchema,
});

export type CompanyFormValues = z.infer<typeof schema>;

// Máquina de estados do passo da empresa: cria a org no Clerk (+ logo staged) →
// aguarda o BE provisionar o tenant (poll /identity/me) → grava o perfil.
type Phase = "idle" | "creating" | "provisioning" | "saving";

const EMPTY_ADDRESS = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

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

  const toInput = (values: CompanyFormValues): OrgProfileInput => {
    const addressTouched = Object.values(values.address).some(
      (v) => (v ?? "").trim() !== "",
    );
    const address: Address | undefined = addressTouched
      ? {
          cep: onlyDigits(values.address.cep),
          logradouro: values.address.logradouro.trim(),
          numero: values.address.numero?.trim() || undefined,
          complemento: values.address.complemento?.trim() || undefined,
          bairro: values.address.bairro?.trim() || undefined,
          cidade: values.address.cidade.trim(),
          uf: values.address.uf.trim().toUpperCase(),
        }
      : undefined;

    return {
      cnpj: onlyDigits(values.cnpj),
      phone: onlyDigits(values.phone ?? "") || undefined,
      email: values.email?.trim() || undefined,
      legal_name: values.legal_name?.trim() || values.trade_name.trim(),
      trade_name: values.trade_name.trim(),
      address,
    };
  };

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
      persistProfile(toInput(values));
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
    showAddress,
    openAddress: () => setShowAddress(true),
    removeAddress,
    logoPreview,
    selectLogo,
  };
}
