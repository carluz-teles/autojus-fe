"use client";

import { X } from "lucide-react";

import { usePerfilEditForm } from "../../hooks/use-perfil-edit-form";

// Modal "Editar dados" do Perfil — só o NOME (Clerk headless user.update),
// mesmo chrome Linear do OrgEditModal. Componente = JSX + binding.
export function PerfilEditModal({ onFechar }: { onFechar: () => void }) {
  const f = usePerfilEditForm({ onDone: onFechar });

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[420px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
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
          <button
            onClick={onFechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            f.salvar();
          }}
        >
          <div className="grid grid-cols-2 gap-3 px-[22px] py-[18px]">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Nome</span>
              <input
                autoFocus
                value={f.firstName}
                onChange={(e) => f.setFirstName(e.target.value)}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">
                Sobrenome
              </span>
              <input
                value={f.lastName}
                onChange={(e) => f.setLastName(e.target.value)}
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
            </label>
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
