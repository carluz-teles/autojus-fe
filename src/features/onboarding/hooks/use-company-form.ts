"use client";

import { useOrganizationList, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { OrgProfileInput, SyncIdentityInput } from "../types";
import { useOnboarding } from "./use-onboarding";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const schema = z.object({
  cnpj: z
    .string()
    .refine((v) => onlyDigits(v).length === 14, "CNPJ deve ter 14 dígitos."),
  legal_name: z.string().trim().min(1, "Informe a razão social."),
  trade_name: z.string().trim().min(1, "Informe o nome fantasia."),
  address: z.object({
    cep: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido."),
    logradouro: z.string().trim().min(1, "Informe o logradouro."),
    numero: z.string().trim().optional(),
    complemento: z.string().trim().optional(),
    bairro: z.string().trim().optional(),
    cidade: z.string().trim().min(1, "Informe a cidade."),
    uf: z.string().trim().length(2, "UF com 2 letras."),
  }),
});

export type CompanyFormValues = z.infer<typeof schema>;

// Máquina de estados do passo 2: cria a org no Clerk → provisiona o tenant de forma
// SÍNCRONA via POST /identity/sync (JIT, sem pollar o webhook) → grava o perfil.
// Enquanto ≠ "idle", mostramos "preparando sua conta…".
type Phase = "idle" | "creating" | "syncing" | "saving";

/**
 * Passo 2 (empresa). Concentra toda a lógica: RHF + Zod, autofetch de CNPJ/CEP,
 * criação da Clerk Organization e o provisionamento síncrono do tenant antes do PUT.
 */
export function useCompanyForm({ onDone }: { onDone: () => void }) {
  const { isLoaded, createOrganization, setActive } = useOrganizationList();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>("idle");
  const {
    tenantReady,
    syncIdentity,
    updateOrgProfile,
    profileError,
    lookupCnpj,
    lookupCep,
  } = useOnboarding();

  const [lookupState, setLookupState] = useState<"idle" | "loading" | "failed">(
    "idle",
  );
  const [orgError, setOrgError] = useState<string | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cnpj: "",
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

  // Autofetch por CNPJ (blur com 14 dígitos): pré-preenche os campos. Degrada em
  // timeout/404 → mantém tudo editável e sinaliza `lookupFailed`.
  const onCnpjBlur = async () => {
    const cnpj = onlyDigits(getValues("cnpj"));
    if (cnpj.length !== 14) return;
    setLookupState("loading");
    try {
      const data = await lookupCnpj(cnpj);
      const opts = { shouldValidate: formState.isSubmitted };
      setValue("legal_name", data.legal_name, opts);
      setValue("trade_name", data.trade_name, opts);
      setValue("address.cep", data.address.cep, opts);
      setValue("address.logradouro", data.address.logradouro, opts);
      setValue("address.numero", data.address.numero ?? "", opts);
      setValue("address.complemento", data.address.complemento ?? "", opts);
      setValue("address.bairro", data.address.bairro ?? "", opts);
      setValue("address.cidade", data.address.cidade, opts);
      setValue("address.uf", data.address.uf, opts);
      setLookupState("idle");
    } catch {
      setLookupState("failed");
    }
  };

  // Autofetch por CEP (blur com 8 dígitos): completa o endereço; degrada em silêncio.
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

  const persistProfile = async (input: OrgProfileInput) => {
    setPhase("saving");
    try {
      await updateOrgProfile(input);
      setPhase("idle");
      onDone();
    } catch {
      setPhase("idle"); // erro exposto em profileError
    }
  };

  // setActive troca a org ativa, mas o token que o apiFetch anexa pode levar um
  // instante pra carregar o novo org_id — enquanto isso o /sync devolve 401
  // ("missing organization in token"). Re-tentamos curto (~2s no total); o /sync é
  // idempotente, então repetir é seguro. Substitui o antigo poll de 40s do /me.
  const syncWithRetry = async (input: SyncIdentityInput) => {
    let lastErr: unknown;
    for (let i = 0; i < 4; i++) {
      try {
        await syncIdentity(input);
        return;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw lastErr;
  };

  const submit = handleSubmit(async (values) => {
    setOrgError(null);

    // Tenant já provisionado (ex.: usuário voltou ao passo) → grava direto.
    if (tenantReady) {
      await persistProfile(toInput(values));
      return;
    }

    if (!isLoaded || !createOrganization || !setActive) return;

    // 1) Cria a Clerk Organization e a torna ativa (dá ao token o org_id).
    setPhase("creating");
    try {
      const org = await createOrganization({ name: values.trade_name.trim() });
      await setActive({ organization: org.id });
    } catch {
      setPhase("idle");
      setOrgError("Não foi possível criar sua organização. Tente novamente.");
      return;
    }

    // 2) Provisiona o tenant de forma SÍNCRONA (JIT): o BE cria tenant+user+
    //    membership do org_id do token e devolve o Me na hora — sem pollar o webhook.
    setPhase("syncing");
    try {
      await syncWithRetry({
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        name: user?.fullName ?? "",
        org_name: values.trade_name.trim(),
      });
    } catch {
      setPhase("idle");
      setOrgError(
        "Não foi possível preparar sua conta. Tente novamente em instantes.",
      );
      return;
    }

    // 3) Tenant pronto → grava o perfil e avança.
    await persistProfile(toInput(values));
  });

  return {
    register,
    submit,
    errors: formState.errors,
    onCnpjBlur,
    onCepBlur,
    isLookingUpCnpj: lookupState === "loading",
    lookupFailed: lookupState === "failed",
    isPreparing: phase !== "idle",
    isReady: isLoaded,
    orgError,
    profileError,
  };
}
