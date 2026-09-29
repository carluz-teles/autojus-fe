"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import { completePersonalProfile } from "../services/onboarding.service";

export type PersonalUser =
  | {
      firstName: string | null;
      lastName: string | null;
      primaryEmailAddress?: { emailAddress: string } | null;
    }
  | null
  | undefined;

const schema = z.object({
  firstName: z.string().trim().min(1, "Informe seu nome."),
  lastName: z.string().trim().min(1, "Informe seu sobrenome."),
});
type Values = z.infer<typeof schema>;

export function usePersonalProfile(user: PersonalUser, onComplete: () => void) {
  const api = useApi();
  const prefilled = useRef(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "" },
  });
  const { reset } = form;
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    reset({ firstName: user.firstName ?? "", lastName: user.lastName ?? "" });
  }, [user, reset]);
  const submit = form.handleSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await completePersonalProfile(
        api,
        values.firstName.trim(),
        values.lastName.trim(),
      );
      onComplete();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir o perfil. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  });
  return { form, submit, error, saving };
}
