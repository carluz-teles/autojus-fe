"use client";

import { Select } from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";

import { useAssignResponsavel } from "../../hooks/use-assign-responsavel";

// Slot "Responsável" do card de partes (§ partes): seletor para (re)atribuir ou
// remover o responsável interno do processo. O bloco visual (avatar + nome +
// cargo + email) é responsabilidade do ResponsavelCard, que já tem o dado —
// aqui só o controle de escrita. Dado real: assigned_user_* do ProcessoView +
// GET /v1/organization/members; escrita por PUT /v1/processos/:id/responsavel
// (null = remover). Só JSX + binding — a lista vem do diretório de membros, a
// escrita do hook de mutação.
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
    <Select
      aria-label="Responsável pelo processo"
      className="h-8 w-full text-sm"
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
  );
}
