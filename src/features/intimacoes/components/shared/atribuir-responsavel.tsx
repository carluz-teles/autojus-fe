"use client";

import { Menu } from "@base-ui/react/menu";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn } from "@/lib/utils";

import {
  intimacoesKeys,
  useAssignIntimacaoResponsaveis,
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

/** Atribui o condutor do prazo direto da linha da lista. O trigger é o avatar do
 *  condutor (ou um círculo tracejado quando não atribuído); o menu lista os
 *  membros do escritório. Preserva o revisor (PUT /responsaveis substitui os dois
 *  papéis) e invalida a lista pra a linha reidratar. */
export function AtribuirResponsavel({
  intimacao,
}: {
  intimacao: IntimacaoView;
}) {
  const { members } = useOrgMembersDirectory();
  const qc = useQueryClient();
  const assign = useAssignIntimacaoResponsaveis(intimacao.id);

  const atribuir = (conductorUserId: string | null) => {
    assign.mutate(
      { conductorUserId, reviewerUserId: intimacao.reviewer_user_id },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: intimacoesKeys.lists() }),
      },
    );
  };

  const atual = intimacao.conductor_user_id ?? "";
  // Nome do condutor: o join do BE (conductor_user_name) pode vir vazio; resolve
  // pelo diretório (nome ou e-mail) a partir do id pra a linha não parecer vazia.
  const condutor = intimacao.conductor_user_id
    ? members.find((m) => m.id === intimacao.conductor_user_id)
    : undefined;
  const condutorNome =
    intimacao.conductor_user_name?.trim() ||
    (condutor ? nomeExibicao(condutor.name, condutor.email) : "");

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={
          condutorNome ? `Responsável: ${condutorNome}` : "Atribuir responsável"
        }
        title={condutorNome || "Atribuir responsável"}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="hover:ring-border flex cursor-pointer items-center rounded-full outline-none hover:ring-2"
      >
        {condutorNome ? (
          <Avatar
            size="sm"
            variant="outline"
            initials={initials(condutorNome)}
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
