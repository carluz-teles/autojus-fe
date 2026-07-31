"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  first_name: z.string().trim().min(1, "Informe o nome."),
  last_name: z.string().trim().min(1, "Informe o sobrenome."),
});

type Values = z.infer<typeof schema>;

// Form de dados pessoais (nome/sobrenome) sobre user.update. Erro do Clerk vem por
// `error` do hook; sucesso mostra um aviso efêmero.
export function PersonalForm({
  defaults,
  saving,
  onSave,
}: {
  defaults: Values;
  saving: boolean;
  onSave: (
    first: string,
    last: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const submit = handleSubmit(async (v) => {
    setFeedback(null);
    const res = await onSave(v.first_name.trim(), v.last_name.trim());
    if (res.ok) {
      reset(v);
      setFeedback({ ok: true, msg: "Dados salvos." });
    } else {
      setFeedback({ ok: false, msg: res.error ?? "Não foi possível salvar." });
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first_name">Nome</Label>
          <Input
            id="first_name"
            autoComplete="given-name"
            aria-invalid={errors.first_name ? true : undefined}
            {...register("first_name")}
          />
          {errors.first_name ? (
            <p className="text-destructive text-sm">
              {errors.first_name.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last_name">Sobrenome</Label>
          <Input
            id="last_name"
            autoComplete="family-name"
            aria-invalid={errors.last_name ? true : undefined}
            {...register("last_name")}
          />
          {errors.last_name ? (
            <p className="text-destructive text-sm">
              {errors.last_name.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        {feedback ? (
          <p
            className={
              feedback.ok
                ? "text-sm text-emerald-600"
                : "text-destructive text-sm"
            }
            role={feedback.ok ? "status" : "alert"}
          >
            {feedback.msg}
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={saving || !isDirty}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
