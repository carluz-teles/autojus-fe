"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/mock-ui/data-display";
import { DatePicker } from "@/components/mock-ui/date-picker";
import { Chip, StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";

import { useActionItemDetalhe } from "../hooks/use-action-items";
import {
  useComecarActionItem,
  useConcluirActionItem,
  useIniciarActionItem,
  useUpdateActionItem,
} from "../hooks/use-update-action-item";
import { STATUS_LABEL } from "../lib/status-pill";
import type { ActionItemPriority, ActionItemStatus } from "../types";

// Detalhe REAL da providência (GET /v1/action-items/:id), fiel ao design isTarefa:
// MAIN (título + descrição + origem) à esquerda, ASIDE (Propriedades) à direita.
// SEM abas de checklist/comentários/atividade — o BE removeu esses endpoints; a
// providência é a unidade atômica de trabalho, sem sub-itens. Nada de "IA" no
// texto (diretiva app-wide): a origem é comunicada pela ação ("derivada da
// intimação"), não pela tecnologia.

// Status de trabalho → tom do StatusBadge.
const TOM_STATUS: Record<ActionItemStatus, Tom> = {
  SUGGESTED: "neutral",
  TODO: "neutral",
  WORKING: "info",
  DONE: "success",
};

// Prioridade: rótulo PT ↔ enum do BE, com a cor do dot.
export const PRIORIDADE_LABEL: Record<ActionItemPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};
export const PRIORIDADE_COR: Record<ActionItemPriority, string> = {
  HIGH: "var(--destructive)",
  MEDIUM: "var(--gold)",
  LOW: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
};
const PRIORIDADE_OPCOES: ActionItemPriority[] = ["HIGH", "MEDIUM", "LOW"];
// Valor-sentinela do Select para "sem prioridade" (o Select não aceita value="").
const SEM_PRIORIDADE = "__none__";

// Transições de trabalho ALCANÇÁVEIS a partir do status atual (ciclo linear:
// SUGGESTED → TODO → WORKING → DONE). Cada valor mapeia para o endpoint de domínio.
const TRANSICOES: Record<
  ActionItemStatus,
  { value: string; label: string; cor: string }[]
> = {
  SUGGESTED: [
    { value: "iniciar", label: "A Fazer", cor: "var(--muted-foreground)" },
  ],
  TODO: [{ value: "comecar", label: "Em elaboração", cor: "var(--gold)" }],
  WORKING: [{ value: "concluir", label: "Concluída", cor: "var(--success)" }],
  DONE: [],
};

const STATUS_DOT: Record<ActionItemStatus, string> = {
  SUGGESTED: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  TODO: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  WORKING: "var(--gold)",
  DONE: "var(--success)",
};

// Código curto derivado do id (o read model não tem um "codigo" próprio) — PRV-XXXX.
function codigoCurto(id: string): string {
  return `PRV-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Detalhe da providência no estilo Linear: título à esquerda, propriedades à direita. */
export function ProvidenciaDetail({ id }: { id: string }) {
  const { data: p, isPending, error } = useActionItemDetalhe(id);
  const { members } = useOrgMembersDirectory();

  const update = useUpdateActionItem();
  const iniciar = useIniciarActionItem();
  const comecar = useComecarActionItem();
  const concluir = useConcluirActionItem();

  if (isPending) {
    return (
      <div className="p-10">
        <div className="bg-muted h-8 w-80 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="p-10">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar esta providência. Tente novamente.
        </p>
      </div>
    );
  }

  const dueISO = p.due_date ? p.due_date.slice(0, 10) : "";
  const transicoes = TRANSICOES[p.status];

  const aplicarTransicao = (v: string) => {
    if (v === "iniciar") iniciar.mutate(p.id);
    else if (v === "comecar") comecar.mutate(p.id);
    else if (v === "concluir") concluir.mutate(p.id);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-y-auto px-10 pt-8 pb-10">
        <div className="flex items-center gap-2.5">
          <Chip>{codigoCurto(p.id)}</Chip>
          <StatusBadge tone={TOM_STATUS[p.status]}>
            {STATUS_LABEL[p.status]}
          </StatusBadge>
          {p.gera_peca ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                color: "var(--gold)",
                background: "color-mix(in oklch, var(--gold) 12%, transparent)",
              }}
            >
              Peça
            </span>
          ) : null}
        </div>

        <h1 className="font-display mt-3.5 max-w-160 text-3xl leading-tight font-normal tracking-tight">
          {p.title}
        </h1>
        {p.description ? (
          <p className="mt-4 max-w-160 text-[15px] leading-relaxed text-pretty">
            {p.description}
          </p>
        ) : null}
        {p.intimation_id ? (
          <p className="text-muted-foreground mt-3 text-[12.5px]">
            Derivada da intimação · vinculada à{" "}
            <Link href={`/intimacoes/${p.intimation_id}`}>
              intimação de origem
            </Link>
          </p>
        ) : null}
      </div>

      <aside className="border-border overflow-y-auto border-l px-6 pt-8 pb-10">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
          Propriedades
        </p>

        <div className="mt-3.5 flex flex-col">
          <Propriedade rotulo="Status">
            {transicoes.length > 0 ? (
              <Select value="" onValueChange={(v) => v && aplicarTransicao(v)}>
                <SelectTrigger
                  className="w-46"
                  aria-label="Status da providência"
                >
                  <SelectValue placeholder={STATUS_LABEL[p.status]}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: STATUS_DOT[p.status] }}
                      />
                      {STATUS_LABEL[p.status]}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {transicoes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: t.cor }}
                      />
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="flex items-center gap-2 text-[13px]">
                <span
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: STATUS_DOT[p.status] }}
                />
                {STATUS_LABEL[p.status]}
              </span>
            )}
          </Propriedade>

          <Propriedade rotulo="Responsável">
            <Select
              value={p.assignee_user_id ?? ""}
              onValueChange={(v) =>
                v != null &&
                update.updateActionItem({
                  id: p.id,
                  patch: { assignee_user_id: v },
                })
              }
            >
              <SelectTrigger
                className="w-46"
                aria-label="Responsável pela providência"
              >
                {/* children explícito — sem isso o Select (base-ui) mostra o
                    value cru (o uuid) no estado fechado. */}
                <SelectValue>
                  {(() => {
                    const m = members.find((m) => m.id === p.assignee_user_id);
                    return m ? nomeExibicao(m.name, m.email) || "—" : "Ninguém";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {nomeExibicao(m.name, m.email) || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Prioridade">
            <Select
              value={p.priority ?? SEM_PRIORIDADE}
              onValueChange={(v) =>
                v != null &&
                update.updateActionItem({
                  id: p.id,
                  patch: {
                    priority:
                      v === SEM_PRIORIDADE ? "" : (v as ActionItemPriority),
                  },
                })
              }
            >
              <SelectTrigger
                className="w-46"
                aria-label="Prioridade da providência"
              >
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {p.priority ? (
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: PRIORIDADE_COR[p.priority] }}
                      />
                    ) : null}
                    {p.priority
                      ? PRIORIDADE_LABEL[p.priority]
                      : "Sem prioridade"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={SEM_PRIORIDADE}>Sem prioridade</SelectItem>
                {PRIORIDADE_OPCOES.map((pr) => (
                  <SelectItem key={pr} value={pr}>
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: PRIORIDADE_COR[pr] }}
                    />
                    {PRIORIDADE_LABEL[pr]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Vencimento">
            <DatePicker
              valor={dueISO}
              onChange={(iso) =>
                update.updateActionItem({ id: p.id, patch: { due_date: iso } })
              }
            />
          </Propriedade>
        </div>

        {p.assignee_user_id ? (
          <div className="mt-6 flex items-center gap-2.5">
            <Avatar
              nome={(() => {
                const m = members.find((m) => m.id === p.assignee_user_id);
                return m ? nomeExibicao(m.name, m.email) || "—" : "—";
              })()}
              size={28}
            />
            <span className="text-muted-foreground text-[12.5px]">
              responsável pela providência
            </span>
          </div>
        ) : null}

        {p.intimation_id ? (
          <>
            <p className="text-muted-foreground mt-7 text-[11px] font-medium tracking-[0.08em] uppercase">
              Origem
            </p>
            <div className="mt-3.5 flex flex-col">
              <Link
                href={`/intimacoes/${p.intimation_id}`}
                className="border-border flex flex-col gap-1 border-b py-2.5 no-underline hover:no-underline"
              >
                <span className="text-muted-foreground text-[12.5px]">
                  Intimação
                </span>
                <span className="text-primary inline-flex items-center gap-1.5 text-[13px]">
                  Abrir intimação
                  <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
                </span>
              </Link>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function Propriedade({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-3 border-b py-2.5">
      <span className="text-muted-foreground text-[12.5px]">{rotulo}</span>
      {children}
    </div>
  );
}
