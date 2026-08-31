"use client";

import { Monitor } from "lucide-react";

import { usePerfilSessoes } from "../../hooks/use-perfil-sessoes";

// Card "Sessões ativas" da aba Perfil (Clerk headless getSessions/revoke).
export function ConfigPerfilSessoes() {
  const s = usePerfilSessoes();

  return (
    <div className="border-line bg-panel mt-6 overflow-hidden rounded-xl border">
      <div className="border-line2 border-b px-4 py-3">
        <div className="text-[13px] font-medium">Sessões ativas</div>
        <p className="text-fg3 mt-px text-[11.5px]">
          Dispositivos conectados à sua conta. Encerre os que não reconhecer.
        </p>
      </div>

      {s.isError ? (
        <p className="text-destructive px-4 py-6 text-center text-[12.5px]">
          Não foi possível carregar as sessões.
        </p>
      ) : s.isPending ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <span className="bg-hover size-8 flex-none animate-pulse rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="bg-hover mb-1.5 block h-3 w-40 animate-pulse rounded" />
              <span className="bg-hover block h-2.5 w-56 animate-pulse rounded" />
            </span>
          </div>
        ))
      ) : (
        s.sessoes.map((ss) => (
          <div
            key={ss.id}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <span className="border-line text-fg2 grid size-8 flex-none place-items-center rounded-lg border">
              <Monitor className="size-[15px]" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[13px] font-medium">
                {ss.dispositivo}
                {ss.atual ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background:
                        "color-mix(in oklch, var(--green) 14%, transparent)",
                      color: "var(--green)",
                    }}
                  >
                    atual
                  </span>
                ) : null}
              </span>
              <span className="text-fg3 block text-[11.5px]">
                {ss.detalhe} · {ss.quando}
              </span>
            </span>
            {ss.atual ? null : (
              <button
                onClick={ss.revogar}
                disabled={ss.revogando}
                className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50"
              >
                {ss.revogando ? "Encerrando…" : "Encerrar"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
