"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Mail } from "lucide-react";

import { useEquipe } from "../../hooks/use-equipe";
import { type InvitationStatus, useInvite } from "../../hooks/use-invite";
import { BRAND_GRADIENT, SettingsSection } from "./config-kit";
import { InviteModal } from "./invite-modal";

const INVITATION_LABELS: Record<InvitationStatus, string> = {
  pending: "Convite pendente",
  accepted: "Convite aceito",
  expired: "Convite expirado",
  revoked: "Convite revogado",
};
const STATUS_OPTIONS: { value: InvitationStatus; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "accepted", label: "Aceitos" },
  { value: "expired", label: "Expirados" },
  { value: "revoked", label: "Revogados" },
];
const ACTION_CLASS =
  "border-line bg-panel text-fg2 hover:bg-hover flex min-h-9 flex-none items-center rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50 pointer-coarse:min-h-11";

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
      <div className="surface-panel overflow-hidden">
        {equipe.error ? (
          <div className="text-destructive border-line2 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-[12.5px]">
            <span>Não foi possível carregar os membros.</span>
            <button
              className={ACTION_CLASS}
              onClick={() => void equipe.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : equipe.isPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-line2 flex items-center gap-3 border-b px-4 py-3"
            >
              <span className="bg-hover size-[30px] flex-none animate-pulse rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="bg-hover mb-1.5 block h-3 w-32 animate-pulse rounded" />
                <span className="bg-hover block h-2.5 w-40 animate-pulse rounded" />
              </span>
            </div>
          ))
        ) : equipe.lista.length === 0 ? (
          <div className="text-fg3 border-line2 border-b px-4 py-5 text-center text-[12.5px]">
            Nenhum membro ativo.
          </div>
        ) : (
          equipe.lista.map((m) => (
            <div
              key={m.id}
              className="border-line2 flex flex-wrap items-center gap-3 border-b px-4 py-3"
            >
              <span className="border-line text-fg2 grid size-[30px] flex-none place-items-center rounded-full border text-[11px]">
                {m.ini}
              </span>
              <span className="min-w-0 flex-1 max-sm:basis-[calc(100%-46px)]">
                <span className="block truncate text-[13px] font-medium">
                  {m.nome}{" "}
                  {m.isSelf ? <span className="text-fg3">(Você)</span> : null}
                </span>
                <span
                  className="text-fg3 block truncate text-[11.5px]"
                  title={m.email}
                >
                  {m.email}
                </span>
                {m.error ? (
                  <span
                    role="alert"
                    className="text-destructive block text-[11.5px]"
                  >
                    {m.error}
                  </span>
                ) : null}
              </span>
              <span
                className="flex-none text-[11.5px] font-medium"
                style={{ color: m.papelCor }}
              >
                {m.papel} · Ativo
              </span>
              {inv.isAdmin && equipe.selfKnown && !m.isSelf ? (
                <button
                  className={ACTION_CLASS}
                  onClick={m.requestRemoval}
                  aria-label={`Remover ${m.nome} da equipe`}
                >
                  Remover
                </button>
              ) : null}
            </div>
          ))
        )}

        <div className="border-line2 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <span className="text-fg3 text-[11.5px]">Convites</span>
          <label className="text-fg3 flex items-center gap-2 text-[11.5px]">
            Status
            <select
              value={inv.invitationStatus}
              onChange={(event) =>
                inv.setInvitationStatus(event.target.value as InvitationStatus)
              }
              className="border-line bg-panel text-fg2 min-h-9 rounded-[7px] border px-2 pointer-coarse:min-h-11"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {inv.invitationNotice ? (
          <p
            role="alert"
            className="text-destructive border-line2 border-b px-4 py-3 text-[12.5px]"
          >
            {inv.invitationNotice}
          </p>
        ) : null}
        {inv.invitationError ? (
          <p role="alert" className="text-destructive px-4 py-4 text-[12.5px]">
            Não foi possível carregar os convites. Tente novamente.
          </p>
        ) : inv.invitationLoading ? (
          <p className="text-fg3 px-4 py-4 text-[12.5px]">
            Carregando convites…
          </p>
        ) : inv.pendentes.length === 0 ? (
          <p className="text-fg3 px-4 py-4 text-[12.5px]">
            Nenhum convite com este status.
          </p>
        ) : (
          inv.pendentes.map((p) => (
            <div
              key={p.id}
              className="border-line2 flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
              style={
                p.status === "pending"
                  ? {
                      background:
                        "color-mix(in oklch, var(--gold) 5%, transparent)",
                    }
                  : undefined
              }
            >
              <span className="border-line text-fg3 grid size-[30px] flex-none place-items-center rounded-full border border-dashed">
                <Mail className="size-3.5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 max-sm:basis-[calc(100%-46px)]">
                <span className="block truncate text-[13px]" title={p.email}>
                  {p.email}
                </span>
                <span
                  className="block text-[11.5px]"
                  style={
                    p.status === "pending"
                      ? { color: "var(--gold)" }
                      : undefined
                  }
                >
                  {p.status
                    ? INVITATION_LABELS[p.status]
                    : "Status indisponível"}{" "}
                  · {p.papel}
                </span>
                {p.error ? (
                  <span
                    role="alert"
                    className="text-destructive block text-[11.5px]"
                  >
                    {p.error}
                  </span>
                ) : null}
              </span>
              {inv.isAdmin && p.status === "pending" ? (
                <span className="flex flex-wrap gap-1.5">
                  <button
                    className={ACTION_CLASS}
                    onClick={p.reenviar}
                    disabled={!!p.busy}
                    aria-label={`Reenviar convite para ${p.email}`}
                  >
                    {p.busy === "resend" ? "Reenviando…" : "Reenviar"}
                  </button>
                  <button
                    className={ACTION_CLASS}
                    onClick={p.revogar}
                    disabled={!!p.busy}
                    aria-label={`Revogar convite de ${p.email}`}
                  >
                    {p.busy === "revoke" ? "Revogando…" : "Revogar"}
                  </button>
                </span>
              ) : null}
              {inv.isAdmin && p.status === "expired" ? (
                <button
                  className={ACTION_CLASS}
                  onClick={p.reenviar}
                  disabled={!!p.busy}
                  aria-label={`Criar novo convite para ${p.email}`}
                >
                  {p.busy === "replace" ? "Enviando…" : "Convidar novamente"}
                </button>
              ) : null}
            </div>
          ))
        )}
        {inv.invitationTotal > 20 || inv.invitationPage > 0 ? (
          <div className="border-line2 text-fg3 flex flex-wrap items-center justify-end gap-2 border-t px-4 py-2 text-[11.5px]">
            <span>
              Página {inv.invitationPage + 1} de{" "}
              {Math.max(1, Math.ceil(inv.invitationTotal / 20))}
            </span>
            <button
              className={ACTION_CLASS}
              disabled={inv.invitationPage === 0 || inv.invitationLoading}
              onClick={inv.previousInvitationPage}
            >
              Anterior
            </button>
            <button
              className={ACTION_CLASS}
              disabled={
                (inv.invitationPage + 1) * 20 >= inv.invitationTotal ||
                inv.invitationLoading
              }
              onClick={inv.nextInvitationPage}
            >
              Próxima
            </button>
          </div>
        ) : null}
      </div>

      <Dialog.Root
        open={!!equipe.confirm}
        onOpenChange={(open) => {
          if (!open && !equipe.removingId) equipe.setConfirmId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
          <Dialog.Popup className="surface-panel fixed top-1/2 left-1/2 z-50 w-[440px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5">
            <Dialog.Title className="text-[16px] font-medium">
              Remover membro
            </Dialog.Title>
            <Dialog.Description className="text-fg3 mt-2 text-[12.5px] leading-relaxed">
              {equipe.confirm?.name || equipe.confirm?.email} perderá o acesso a
              este escritório.
            </Dialog.Description>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className={ACTION_CLASS}
                onClick={() => equipe.setConfirmId(null)}
                disabled={!!equipe.removingId}
              >
                Cancelar
              </button>
              <button
                className="bg-destructive min-h-9 rounded-[7px] px-3 text-[12px] text-white disabled:opacity-50 pointer-coarse:min-h-11"
                onClick={() => void equipe.remove()}
                disabled={!!equipe.removingId}
              >
                {equipe.removingId ? "Removendo…" : "Remover membro"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <InviteModal inv={inv} />
    </SettingsSection>
  );
}
