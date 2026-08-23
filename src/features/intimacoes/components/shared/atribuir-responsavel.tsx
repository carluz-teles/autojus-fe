"use client";

import { Menu } from "@base-ui/react/menu";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn } from "@/lib/utils";

import {
  intimacoesKeys,
  useAssignIntimacaoResponsavel,
} from "../../hooks/use-intimacoes";
import type { IntimacaoView } from "../../types";
import { Avatar, initials } from "./avatar";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-72 min-w-48 origin-(--transform-origin) overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50";

/** Nome de exibição de um membro: usa o nome; se vazio (comum em contas Clerk de
 *  teste sem nome preenchido), cai para a parte local do e-mail. */
export function nomeExibicao(
  name?: string | null,
  email?: string | null,
): string {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  return e ? e.split("@")[0] : "";
}

/** Atribui o responsável da intimação direto da linha da lista. O trigger é o
 *  avatar do responsável (ou um círculo tracejado quando não atribuído); o menu
 *  lista os membros do escritório e invalida a lista pra reidratar. */
export function AtribuirResponsavel({
  intimacao,
}: {
  intimacao: IntimacaoView;
}) {
  const { members } = useOrgMembersDirectory();
  const qc = useQueryClient();
  const assign = useAssignIntimacaoResponsavel(intimacao.id);

  const atribuir = (assigneeUserId: string | null) => {
    assign.mutate(
      { assigneeUserId },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: intimacoesKeys.lists() }),
      },
    );
  };

  const atual = intimacao.assignee_user_id ?? "";
  // Nome do responsável: o join do BE (assignee_user_name) pode vir vazio;
  // resolve pelo diretório (nome ou e-mail) pra a linha não parecer vazia.
  const assignee = intimacao.assignee_user_id
    ? members.find((m) => m.id === intimacao.assignee_user_id)
    : undefined;
  const assigneeNome =
    intimacao.assignee_user_name?.trim() ||
    (assignee ? nomeExibicao(assignee.name, assignee.email) : "");

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={
          assigneeNome ? `Responsável: ${assigneeNome}` : "Atribuir responsável"
        }
        title={assigneeNome || "Atribuir responsável"}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="hover:ring-border flex cursor-pointer items-center rounded-full outline-none hover:ring-2"
      >
        {assigneeNome ? (
          <Avatar
            size="sm"
            variant="outline"
            initials={initials(assigneeNome)}
          />
        ) : (
          <span
            aria-hidden
            className="border-muted-foreground/40 hover:border-primary size-6 shrink-0 rounded-full border border-dashed"
          />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup
            className={POPUP_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <Menu.RadioGroup
              value={atual}
              onValueChange={(v) =>
                atribuir(typeof v === "string" && v ? v : null)
              }
            >
              <Menu.RadioItem value="" className={cn(ITEM_CLASS, "gap-2")}>
                <span className="border-muted-foreground/40 size-6 shrink-0 rounded-full border border-dashed" />
                <span className="text-muted-foreground flex-1 truncate">
                  Ninguém
                </span>
                <Menu.RadioItemIndicator className="ml-auto">
                  <Check className="size-4" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
              {members.map((m) => {
                const nome = nomeExibicao(m.name, m.email);
                return (
                  <Menu.RadioItem
                    key={m.id}
                    value={m.id}
                    className={cn(ITEM_CLASS, "gap-2")}
                  >
                    <Avatar size="sm" initials={initials(nome)} />
                    <span className="flex-1 truncate">{nome}</span>
                    <Menu.RadioItemIndicator className="ml-auto">
                      <Check className="size-4" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
