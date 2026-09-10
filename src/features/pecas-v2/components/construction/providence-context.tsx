"use client";
import { TeorContent } from "@/components/teor-content";
import { useActionItemDetalhe } from "@/features/action-items/hooks/use-action-items";
import { useUpdateActionItem } from "@/features/action-items/hooks/use-update-action-item";
import { STATUS_LABEL } from "@/features/action-items/lib/status-pill";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
export function ProvidenceContext({ id }: { id: string }) {
  const action = useActionItemDetalhe(id);
  const update = useUpdateActionItem();
  const directory = useOrgMembersDirectory();
  const p = action.data;
  if (!p) return null;
  const members = directory.members;
  return (
    <section
      aria-label="Providência de origem"
      className="mx-4 mb-4 flex flex-col gap-3 rounded-lg border p-4"
    >
      <p className="text-muted-foreground text-xs">
        Providência de origem · {STATUS_LABEL[p.status]}
      </p>
      <h3 className="font-display text-lg">{p.title}</h3>
      {p.description && (
        <TeorContent
          content={p.description}
          className="text-muted-foreground text-xs"
        />
      )}
      <ResponsavelMenu
        value={p.assignee_user_id}
        nome={members.find((m) => m.id === p.assignee_user_id)?.name}
        membros={members}
        emVoo={update.isPending}
        onAssign={(value) =>
          update.updateActionItem({
            id: p.id,
            patch: { assignee_user_id: value ?? "" },
          })
        }
      />
      <p className="text-muted-foreground text-xs">
        Prazo da providência:{" "}
        {p.due_date
          ? new Date(p.due_date).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })
          : "Não definido"}
      </p>
    </section>
  );
}
