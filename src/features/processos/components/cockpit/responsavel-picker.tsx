"use client";

import { Select } from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn } from "@/lib/utils";

import { useAssignResponsavel } from "../../hooks/use-assign-responsavel";

// Slot "Responsável" do header (§6): mostra o responsável atual (inicial + nome)
// e abre um seletor com os membros do escritório para (re)atribuir ou remover.
// Dado real: assigned_user_* do ProcessoView + GET /v1/organization/members;
// escrita por PUT /v1/processos/:id/responsavel (null = remover). Só JSX +
// binding — a lista vem do diretório de membros, a escrita do hook de mutação.
export function ResponsavelPicker({
  processoId,
  assignedUserId,
  assignedUserName,
}: {
  processoId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
}) {
  const { members, isPending: membersPending } = useOrgMembersDirectory();
  const assign = useAssignResponsavel(processoId);

  const disabled = membersPending || assign.isPending;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold",
          assignedUserName
            ? "bg-gold/15 text-gold"
            : "bg-muted text-muted-foreground/60",
        )}
        aria-hidden
      >
        {initial(assignedUserName)}
      </span>
      <Select
        aria-label="Responsável pelo processo"
        className="h-7 min-w-40 py-0.5 text-sm"
        value={assignedUserId ?? ""}
        disabled={disabled}
        onChange={(e) => assign.mutate(e.target.value || null)}
      >
        <option value="">Sem responsável</option>
        {/* Guarda o responsável atual na lista mesmo se não vier no diretório. */}
        {assignedUserId && !members.some((m) => m.id === assignedUserId) ? (
          <option value={assignedUserId}>{assignedUserName ?? "—"}</option>
        ) : null}
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function initial(name: string | null): string {
  const c = name?.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}
