"use client";

import { useOrganization } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome do escritório."),
});

type Values = z.infer<typeof schema>;

// Card "Dados do escritório" headless — nome da organização (= tenant) editável via
// organization.update. Só admin. Substitui a aba de settings do <OrganizationProfile/>.
// Perfil fiscal (CNPJ/endereço) fica numa fatia futura (depende de um GET no BE).
export function OrgSettings() {
  const { isLoaded, organization, membership } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { name: organization?.name ?? "" },
  });

  if (!isLoaded || !organization || membership?.role !== "org:admin") {
    return null;
  }

  const submit = handleSubmit(async ({ name }) => {
    setFeedback(null);
    setSaving(true);
    try {
      await organization.update({ name: name.trim() });
      reset({ name: name.trim() });
      setFeedback({ ok: true, msg: "Escritório atualizado." });
    } catch {
      setFeedback({ ok: false, msg: "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card className="reveal mt-8 flex flex-col gap-4 p-6">
      <h2 className="text-lg font-medium">Dados do escritório</h2>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="org_name">Nome do escritório</Label>
          <Input
            id="org_name"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-destructive text-sm">{errors.name.message}</p>
          ) : null}
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
    </Card>
  );
}
