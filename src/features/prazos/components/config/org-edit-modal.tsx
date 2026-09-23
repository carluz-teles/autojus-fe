"use client";

import { X } from "lucide-react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { useOrgProfileEditForm } from "@/features/organization/hooks/use-org-profile-edit-form";
import { maskCnpj, maskPhone } from "@/lib/masks";

// Modal de edição do perfil FISCAL do escritório (PUT /v1/organization/profile,
// Auth ADMIN). Reusa o form/schema do onboarding via useOrgProfileEditForm —
// aqui só o chrome Linear + binding. Estilo alinhado ao invite-modal.
export function OrgEditModal({ onFechar }: { onFechar: () => void }) {
  const f = useOrgProfileEditForm({ onDone: onFechar });
  const { errors } = f;
  const cnpj = f.register("cnpj");
  const phone = f.register("phone");

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-panel w-[460px] max-w-full overflow-hidden rounded-2xl"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              Editar dados do escritório
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">
              Aparecem nas peças e no cadastro junto aos tribunais.
            </p>
          </div>
          <IconAction
            label="Fechar edição do escritório"
            icon={X}
            onClick={onFechar}
          />
        </div>

        <form onSubmit={f.submit} noValidate>
          <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
            <Field data-invalid={!!errors.trade_name}>
              <FieldLabel htmlFor="org-trade-name">
                Nome do escritório
              </FieldLabel>
              <Input
                id="org-trade-name"
                aria-invalid={!!errors.trade_name}
                {...f.register("trade_name")}
              />
              <FieldError errors={[errors.trade_name]} />
            </Field>

            <Field data-invalid={!!errors.cnpj}>
              <FieldLabel htmlFor="org-cnpj">CNPJ</FieldLabel>
              <Input
                id="org-cnpj"
                inputMode="numeric"
                aria-invalid={!!errors.cnpj}
                {...cnpj}
                onChange={(e) => {
                  e.target.value = maskCnpj(e.target.value);
                  void cnpj.onChange(e);
                }}
              />
              <FieldError errors={[errors.cnpj]} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="org-email">E-mail administrativo</FieldLabel>
              <Input
                id="org-email"
                type="email"
                inputMode="email"
                aria-invalid={!!errors.email}
                {...f.register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="org-phone">Telefone</FieldLabel>
              <Input
                id="org-phone"
                type="tel"
                inputMode="tel"
                aria-invalid={!!errors.phone}
                {...phone}
                onChange={(e) => {
                  e.target.value = maskPhone(e.target.value);
                  void phone.onChange(e);
                }}
              />
              <FieldError errors={[errors.phone]} />
            </Field>

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <Field data-invalid={!!errors.address?.cidade}>
                <FieldLabel htmlFor="org-cidade">Cidade</FieldLabel>
                <Input
                  id="org-cidade"
                  placeholder="Franca"
                  aria-invalid={!!errors.address?.cidade}
                  {...f.register("address.cidade")}
                />
                <FieldError errors={[errors.address?.cidade]} />
              </Field>
              <Field data-invalid={!!errors.address?.uf}>
                <FieldLabel htmlFor="org-uf">UF</FieldLabel>
                <Input
                  id="org-uf"
                  maxLength={2}
                  placeholder="SP"
                  className="uppercase"
                  aria-invalid={!!errors.address?.uf}
                  {...f.register("address.uf")}
                />
                <FieldError errors={[errors.address?.uf]} />
              </Field>
            </div>
          </div>

          <div className="border-line2 flex justify-end gap-2 border-t px-[22px] py-3.5">
            <button
              type="button"
              onClick={onFechar}
              className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={f.isSaving || f.isProfileLoading}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
            >
              {f.isSaving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
