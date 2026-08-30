"use client";

import { X } from "lucide-react";

import { useOrgProfileEditForm } from "@/features/organization/hooks/use-org-profile-edit-form";
import { maskCnpj, maskPhone } from "@/lib/masks";

// Modal de edição do perfil FISCAL do escritório (PUT /v1/organization/profile,
// Auth ADMIN). Reusa o form/schema do onboarding via useOrgProfileEditForm —
// aqui só o chrome Linear + binding. Estilo alinhado ao invite-modal.
export function OrgEditModal({ onFechar }: { onFechar: () => void }) {
  const f = useOrgProfileEditForm({ onDone: onFechar });
  const cnpj = f.register("cnpj");
  const phone = f.register("phone");

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[460px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
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
          <button
            onClick={onFechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={f.submit} noValidate>
          <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
            <Campo
              label="Nome do escritório"
              erro={f.errors.trade_name?.message}
            >
              <input
                {...f.register("trade_name")}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </Campo>

            <Campo label="CNPJ" erro={f.errors.cnpj?.message}>
              <input
                inputMode="numeric"
                {...cnpj}
                onChange={(e) => {
                  e.target.value = maskCnpj(e.target.value);
                  void cnpj.onChange(e);
                }}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </Campo>

            <Campo label="E-mail administrativo" erro={f.errors.email?.message}>
              <input
                type="email"
                inputMode="email"
                {...f.register("email")}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </Campo>

            <Campo label="Telefone" erro={f.errors.phone?.message}>
              <input
                type="tel"
                inputMode="tel"
                {...phone}
                onChange={(e) => {
                  e.target.value = maskPhone(e.target.value);
                  void phone.onChange(e);
                }}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </Campo>

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <Campo label="Cidade" erro={f.errors.address?.cidade?.message}>
                <input
                  placeholder="Franca"
                  {...f.register("address.cidade")}
                  className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                />
              </Campo>
              <Campo label="UF" erro={f.errors.address?.uf?.message}>
                <input
                  maxLength={2}
                  placeholder="SP"
                  {...f.register("address.uf")}
                  className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] uppercase outline-none"
                />
              </Campo>
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

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium">{label}</span>
      {children}
      {erro ? (
        <span className="text-destructive mt-1 block text-[11px]">{erro}</span>
      ) : null}
    </label>
  );
}
