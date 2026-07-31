"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

// Form de troca de senha sobre user.updatePassword. Só renderiza quando o usuário
// tem senha (passwordEnabled). Erro do Clerk (ex.: senha atual errada) vem no
// retorno da ação.
export function PasswordForm({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (
    current: string,
    next: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const submit = handleSubmit(async (v) => {
    setFeedback(null);
    const res = await onSave(v.current, v.next);
    if (res.ok) {
      reset({ current: "", next: "", confirm: "" });
      setFeedback({ ok: true, msg: "Senha atualizada." });
    } else {
      setFeedback({
        ok: false,
        msg: res.error ?? "Não foi possível trocar a senha.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="current">Senha atual</Label>
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          {...register("current")}
        />
        {errors.current ? (
          <p className="text-destructive text-sm">{errors.current.message}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="next">Nova senha</Label>
          <Input
            id="next"
            type="password"
            autoComplete="new-password"
            {...register("next")}
          />
          {errors.next ? (
            <p className="text-destructive text-sm">{errors.next.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm ? (
            <p className="text-destructive text-sm">{errors.confirm.message}</p>
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
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Trocar senha"}
        </Button>
      </div>
    </form>
  );
}
