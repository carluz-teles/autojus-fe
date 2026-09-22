"use client";

import { X } from "lucide-react";
import { Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";

import { usePerfilEditForm } from "../../hooks/use-perfil-edit-form";

// Modal "Editar dados" do Perfil — só o NOME (Clerk headless user.update),
// mesmo chrome Linear do OrgEditModal. Componente = JSX + binding.
export function PerfilEditModal({ onFechar }: { onFechar: () => void }) {
  const f = usePerfilEditForm({ onDone: onFechar });
  const {
    control,
    formState: { errors },
  } = f.form;

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-panel w-[420px] max-w-full overflow-hidden rounded-2xl"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              Editar dados
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">
              Como seu nome aparece para a equipe.
            </p>
          </div>
          <IconAction
            label="Fechar edição do perfil"
            icon={X}
            onClick={onFechar}
          />
        </div>

        <form onSubmit={f.salvar} noValidate>
          <div className="grid grid-cols-2 gap-3 px-[22px] py-[18px]">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="perfil-first-name">Nome</FieldLabel>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input
                    id="perfil-first-name"
                    autoFocus
                    aria-invalid={!!errors.firstName}
                    {...field}
                  />
                )}
              />
              <FieldError errors={[errors.firstName]} />
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="perfil-last-name">Sobrenome</FieldLabel>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input
                    id="perfil-last-name"
                    aria-invalid={!!errors.lastName}
                    {...field}
                  />
                )}
              />
              <FieldError errors={[errors.lastName]} />
            </Field>
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
              disabled={f.salvando}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
            >
              {f.salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
