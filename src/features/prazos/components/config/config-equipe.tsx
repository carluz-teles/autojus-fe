"use client";

import { Mail } from "lucide-react";

import { useEquipe } from "../../hooks/use-equipe";
import { useInvite } from "../../hooks/use-invite";
import { BRAND_GRADIENT, SettingsSection } from "./config-kit";
import { InviteModal } from "./invite-modal";

// Aba Equipe — port de Atjus - Convite.dc.html (persona admin): header +
// "Convidar membro" (abre o modal) + membros ATIVOS (BE) + convites PENDENTES
// (Clerk, revogáveis). Componente = JSX + binding; a lógica vive nos hooks.
export function ConfigEquipe() {
  const equipe = useEquipe();
  const inv = useInvite();

  return (
    <SettingsSection
      title="Equipe"
      subtitle="Quem tem acesso e o papel de cada um."
      action={
        inv.isAdmin ? (
          <button
            onClick={inv.abrir}
            style={{ backgroundImage: BRAND_GRADIENT }}
            className="text-primary-foreground flex min-h-9 flex-none items-center rounded-lg px-3.5 py-2 text-[12.5px] font-medium shadow-sm transition-transform duration-200 hover:-translate-y-px pointer-coarse:min-h-11"
          >
            Convidar membro
          </button>
        ) : undefined
      }
    >
      {equipe.error ? (
        <p className="text-destructive text-[12.5px]">
          Não foi possível carregar os membros. Tente novamente.
        </p>
      ) : (
        <div className="surface-panel overflow-hidden">
          {equipe.isPending
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="bg-hover size-[30px] flex-none animate-pulse rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="bg-hover mb-1.5 block h-3 w-32 animate-pulse rounded" />
                    <span className="bg-hover block h-2.5 w-40 animate-pulse rounded" />
                  </span>
                </div>
              ))
            : null}

          {!equipe.isPending &&
          equipe.lista.length === 0 &&
          inv.pendentes.length === 0 ? (
            <div className="text-fg3 px-4 py-8 text-center text-[12.5px]">
              Nenhum membro ainda.
            </div>
          ) : null}

          {equipe.lista.map((m) => (
            <div
              key={m.id}
              className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <span className="border-line text-fg2 grid size-[30px] flex-none place-items-center rounded-full border text-[11px]">
                {m.ini}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{m.nome}</span>
                <span className="text-fg3 block truncate text-[11.5px]">
                  {m.email}
                </span>
              </span>
              <span
                className="text-[11.5px] font-medium"
                style={{ color: m.papelCor }}
              >
                {m.papel}
              </span>
            </div>
          ))}

          {inv.pendentes.map((p) => (
            <div
              key={p.id}
              className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              style={{
                background: "color-mix(in oklch, var(--gold) 5%, transparent)",
              }}
            >
              <span className="border-line text-fg3 grid size-[30px] flex-none place-items-center rounded-full border border-dashed">
                <Mail className="size-3.5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{p.email}</span>
                <span
                  className="block text-[11.5px]"
                  style={{ color: "var(--gold)" }}
                >
                  convite pendente · {p.papel}
                </span>
              </span>
              {inv.isAdmin ? (
                <button
                  onClick={p.reenviar}
                  disabled={p.revogando}
                  className="border-line bg-panel text-fg2 hover:bg-hover flex min-h-9 flex-none items-center rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50 pointer-coarse:min-h-11"
                >
                  {p.revogando ? "Revogando…" : "Revogar"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <InviteModal inv={inv} />
    </SettingsSection>
  );
}
