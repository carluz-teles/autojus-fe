import { UserRound, Users } from "lucide-react";

import { Avatar } from "@/components/mock-ui/data-display";
import { cn } from "@/lib/utils";

export interface ResponsavelProps {
  value?: string | null;
  nome?: string | null;
  multiplo?: boolean;
  className?: string;
}

/** Identidade compartilhada nas listas e nos controles de atribuição. */
export function Responsavel({
  value,
  nome,
  multiplo,
  className,
}: ResponsavelProps) {
  const label = multiplo
    ? "Responsáveis diferentes"
    : value
      ? nome?.trim() || "Responsável atribuído"
      : "Sem responsável";
  const temNome = value && nome?.trim() && nome !== "Responsável atribuído";
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 text-[13px]",
        className,
      )}
      title={label}
    >
      <span aria-hidden="true" className="shrink-0">
        {multiplo ? (
          <span className="border-line text-fg3 grid size-[22px] place-items-center rounded-full border">
            <Users className="size-3" />
          </span>
        ) : temNome ? (
          <Avatar nome={label} size={22} />
        ) : (
          <span
            className={cn(
              "border-line text-fg3 grid size-[22px] place-items-center rounded-full border",
              !value && "border-dashed",
            )}
          >
            <UserRound className="size-3" />
          </span>
        )}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
