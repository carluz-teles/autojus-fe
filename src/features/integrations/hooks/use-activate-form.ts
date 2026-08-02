"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ACTIVATABLE_SOURCES, type IntegrationSource } from "../types";
import { useIntegrations } from "./use-integrations";

// Mesma regra de OAB do BE (validation.go oabRegex): UF + 1–6 dígitos.
const OAB_RE = /^[A-Z]{2}\d{1,6}$/;

const schema = z.object({
  sources: z
    .array(z.enum(ACTIVATABLE_SOURCES))
    .min(1, "Selecione ao menos uma fonte."),
  oab: z
    .array(
      z
        .string()
        .regex(OAB_RE, "OAB inválida — use UF + números (ex.: SP123456)."),
    )
    .min(1, "Adicione ao menos uma OAB."),
});

export type ActivateFormValues = z.infer<typeof schema>;

/**
 * Toda a lógica do formulário de ativação vive aqui (RHF + Zod + mutation).
 * O componente apenas amarra o JSX aos valores/handlers retornados.
 */
export function useActivateForm() {
  const { activate, isActivating, activateError } = useIntegrations();
  const [oabDraft, setOabDraft] = useState("");

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sources: [...ACTIVATABLE_SOURCES], oab: [] },
  });
  const { setValue, getValues, control, handleSubmit, formState } = form;

  // useWatch (em vez de watch()) é o padrão compatível com o react-compiler.
  const sources = useWatch({ control, name: "sources" });
  const oab = useWatch({ control, name: "oab" });

  const toggleSource = (source: IntegrationSource) => {
    const current = getValues("sources");
    setValue(
      "sources",
      current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source],
      { shouldValidate: formState.isSubmitted },
    );
  };

  const addOab = () => {
    const value = oabDraft.trim().toUpperCase();
    if (!value) return;
    const current = getValues("oab");
    if (!current.includes(value)) {
      setValue("oab", [...current, value], {
        shouldValidate: formState.isSubmitted,
      });
    }
    setOabDraft("");
  };

  const removeOab = (value: string) => {
    setValue(
      "oab",
      getValues("oab").filter((v) => v !== value),
      { shouldValidate: formState.isSubmitted },
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    await activate({ sources: values.sources, scope: { oab: values.oab } });
  });

  // Variante imperativa para fluxos que precisam saber se DEU CERTO antes de
  // avançar (ex.: o "Continuar" do onboarding salva e só então troca de passo).
  // Validação reprovada ou activate rejeitado → false; os erros ficam no form.
  const submitAsync = async (): Promise<boolean> => {
    let ok = false;
    try {
      await handleSubmit(async (values) => {
        await activate({ sources: values.sources, scope: { oab: values.oab } });
        ok = true;
      })();
    } catch {
      ok = false;
    }
    return ok;
  };

  return {
    sources,
    oab,
    oabDraft,
    setOabDraft,
    toggleSource,
    addOab,
    removeOab,
    onSubmit,
    submitAsync,
    isActivating,
    activateError,
    justSucceeded: formState.isSubmitSuccessful && !activateError,
    errors: formState.errors,
  };
}
