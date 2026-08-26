"use client";

import { Menu } from "@base-ui/react/menu";
import { Check } from "lucide-react";

import { Avatar } from "@/components/mock-ui/data-display";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn } from "@/lib/utils";

import { useAssignResponsavel } from "../hooks/use-processos";

const POPUP_CLASS =
  "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-72 min-w-48 origin-(--transform-origin) overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none";

const ITEM_CLASS =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-[13px] outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50";

/** Nome de exibição de um membro: usa o nome; se vazio, cai para a parte local do
 *  e-mail (mesmo critério usado em Intimações, `nomeExibicao`). */
function nomeExibicao(name?: string | null, email?: string | null): string {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  return e ? e.split("@")[0] : "";
}

/** Atribui o responsável de um processo — mesmo padrão de popover usado em
 *  Intimações (`AtribuirResponsavel`), adaptado ao design system de Processos
 *  (Avatar por iniciais via `nome`, não `initials`). Atribuir cascateia no BE pra
 *  todas as intimações do processo (sempre sobrescreve, retroativo). */
export function AtribuirResponsavelProcesso({
  processoId,
  assigneeUserId,
  assigneeUserName,
  avatarSize = 28,
}: {
  processoId: string;
  assigneeUserId: string | null;
  assigneeUserName: string | null;
  avatarSize?: number;
}) {
  const { members } = useOrgMembersDirectory();
  const assign = useAssignResponsavel(processoId);

  const atual = assigneeUserId ?? "";
  const nomeAtual =
    assigneeUserName?.trim() ||
    (assigneeUserId
      ? nomeExibicao(
          members.find((m) => m.id === assigneeUserId)?.name,
          members.find((m) => m.id === assigneeUserId)?.email,
        )
      : "");

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={
          nomeAtual ? `Responsável: ${nomeAtual}` : "Atribuir responsável"
        }
        title={nomeAtual || "Atribuir responsável"}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="hover:ring-border flex cursor-pointer items-center gap-2.5 rounded-full outline-none hover:ring-2"
      >
        {nomeAtual ? (
          <Avatar nome={nomeAtual} size={avatarSize} />
        ) : (
          <span
            aria-hidden
            className="border-muted-foreground/40 hover:border-primary shrink-0 rounded-full border border-dashed"
            style={{ width: avatarSize, height: avatarSize }}
          />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
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
                assign.mutate(typeof v === "string" && v ? v : null)
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
                    <Avatar nome={nome} size={22} />
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
