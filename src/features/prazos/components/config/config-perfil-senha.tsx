"use client";

import { usePerfilSenha } from "../../hooks/use-perfil-senha";

// Card "Senha" da aba Perfil (Clerk headless updatePassword). Inline, não modal.
export function ConfigPerfilSenha() {
  const s = usePerfilSenha();

  return (
    <div className="border-line bg-panel mt-6 overflow-hidden rounded-xl border">
      <div className="border-line2 border-b px-4 py-3">
        <div className="text-[13px] font-medium">{s.titulo}</div>
        <p className="text-fg3 mt-px text-[11.5px]">
          {s.passwordEnabled
            ? "Confirme a senha atual para definir uma nova."
            : "Defina uma senha para entrar sem provedor externo."}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {s.passwordEnabled ? (
          <label className="block">
            <span className="text-fg3 mb-1.5 block text-[11.5px]">
              Senha atual
            </span>
            <input
              type="password"
              value={s.atual}
              onChange={(e) => s.setAtual(e.target.value)}
              placeholder="••••••••"
              className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
            />
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-fg3 mb-1.5 block text-[11.5px]">
              Nova senha
            </span>
            <input
              type="password"
              value={s.nova}
              onChange={(e) => s.setNova(e.target.value)}
              placeholder="••••••••"
              className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
            />
          </label>
          <label className="block">
            <span className="text-fg3 mb-1.5 block text-[11.5px]">
              Confirmar
            </span>
            <input
              type="password"
              value={s.confirma}
              onChange={(e) => s.setConfirma(e.target.value)}
              placeholder="••••••••"
              className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={s.toggleSairOutras}
            className="relative h-[18px] w-[34px] flex-none rounded-full border-none"
            style={{ background: s.sairTrilho }}
          >
            <span
              className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white transition-transform duration-150"
              style={{ transform: s.sairKnob }}
            />
          </button>
          <span className="text-fg2 text-[12px]">
            Encerrar minhas outras sessões ao trocar a senha
          </span>
        </div>

        {s.erro ? (
          <p className="text-destructive text-[11.5px]" role="alert">
            {s.erro}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            onClick={s.salvar}
            disabled={!s.pode}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
          >
            {s.salvando ? "Salvando…" : s.titulo}
          </button>
        </div>
      </div>
    </div>
  );
}
