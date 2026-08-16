"use client";

import { Scale, UserRound, Users } from "lucide-react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { roleLabel } from "@/features/organization/lib/labels";
import { cn } from "@/lib/utils";

import { useProcessoPartes } from "../../hooks/use-processo-partes";
import type { Party } from "../../types";
import { ResponsavelPicker } from "./responsavel-picker";

// Cards AUTOR / RÉU / RESPONSÁVEL (§ partes): o polo ativo, o passivo e o
// responsável interno do processo. Autor/Réu trazem nome, documento (quando
// houver) e advogado(s) com OAB/UF — dado real de GET /v1/processos/:id/partes.
// Polo vazio → estado discreto "sem partes identificadas ainda" (o card não
// some). Responsável reusa o ResponsavelPicker (antes no header) com o dado que
// o cockpit já tem via processo.assigned_user_*. Só JSX + binding; o fetch de
// partes mora no hook.
export function PartesCards({
  processoId,
  assignedUserId,
  assignedUserName,
}: {
  processoId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
}) {
  const { autor, reu, isPending, isError } = useProcessoPartes(processoId);

  if (isPending) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PoloSkeleton />
        <PoloSkeleton />
        <ResponsavelSkeleton />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <PoloCard
        icon={UserRound}
        label="Autor"
        tone="text-emerald-700 dark:text-emerald-400"
        partes={autor}
        isError={isError}
      />
      <PoloCard
        icon={Scale}
        label="Réu"
        tone="text-destructive"
        partes={reu}
        isError={isError}
      />
      <ResponsavelCard
        processoId={processoId}
        assignedUserId={assignedUserId}
        assignedUserName={assignedUserName}
      />
    </section>
  );
}

// Cruza assignedUserId com o diretório de membros (§ partes-cards) pra exibir
// cargo/e-mail reais — sem inventar dado. Membro que saiu do escritório (id
// atribuído mas ausente do diretório) cai no fallback: só o nome já conhecido
// via assignedUserName, cargo/e-mail omitidos.
function ResponsavelCard({
  processoId,
  assignedUserId,
  assignedUserName,
}: {
  processoId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
}) {
  const { members } = useOrgMembersDirectory();
  const member = assignedUserId
    ? members.find((m) => m.id === assignedUserId)
    : undefined;

  const displayName = assignedUserId
    ? (member?.name ?? assignedUserName ?? "—")
    : null;

  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center gap-2">
        <span className="bg-muted/60 flex size-7 items-center justify-center rounded-lg text-blue-700 dark:text-blue-400">
          <Users className="size-4" />
        </span>
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Responsável Interno
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            displayName
              ? "bg-gold/15 text-gold"
              : "bg-muted text-muted-foreground/60",
          )}
          aria-hidden
        >
          {initial(displayName)}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {displayName ?? "Sem responsável atribuído"}
          </p>
          {member ? (
            <p className="text-muted-foreground text-xs">
              {roleLabel(member.role)}
            </p>
          ) : null}
          {member ? (
            <p className="text-muted-foreground/70 truncate text-xs">
              {member.email}
            </p>
          ) : null}
        </div>
      </div>

      <ResponsavelPicker
        processoId={processoId}
        assignedUserId={assignedUserId}
        assignedUserName={assignedUserName}
      />
    </div>
  );
}

function initial(name: string | null): string {
  const c = name?.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

function PoloCard({
  icon: Icon,
  label,
  tone,
  partes,
  isError,
}: {
  icon: typeof UserRound;
  label: string;
  tone: string;
  partes: Party[];
  isError: boolean;
}) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "bg-muted/60 flex size-7 items-center justify-center rounded-lg",
            tone,
          )}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </h3>
        {partes.length > 1 ? (
          <span className="text-muted-foreground/70 text-xs tabular-nums">
            {partes.length}
          </span>
        ) : null}
      </div>

      {partes.length === 0 ? (
        <p className="text-muted-foreground/70 text-sm">
          {isError
            ? "Não foi possível carregar as partes."
            : "Sem partes identificadas ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {partes.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex flex-col gap-1">
              <p className="text-sm leading-tight font-medium">{p.name}</p>
              {p.document ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {p.document}
                </p>
              ) : null}
              {p.counsels.length > 0 ? (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {p.counsels.map((c, j) => (
                    <li
                      key={`${c.oab}-${j}`}
                      className="text-muted-foreground flex items-center gap-1.5 text-xs"
                    >
                      <Users className="size-3 shrink-0" />
                      <span className="min-w-0 truncate">{c.name}</span>
                      {c.oab ? (
                        <span className="text-muted-foreground/70 shrink-0 tabular-nums">
                          OAB {c.oab}
                          {c.uf ? `/${c.uf}` : ""}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PoloSkeleton() {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1">
      <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      <div className="bg-muted h-4 w-40 animate-pulse rounded" />
      <div className="bg-muted h-3 w-28 animate-pulse rounded" />
    </div>
  );
}

function ResponsavelSkeleton() {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
      <div className="bg-muted h-3 w-32 animate-pulse rounded" />
      <div className="flex items-center gap-3">
        <div className="bg-muted size-11 shrink-0 animate-pulse rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="bg-muted h-4 w-28 animate-pulse rounded" />
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
