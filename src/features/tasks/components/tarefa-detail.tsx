"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Avatar } from "@/components/mock-ui/data-display";
import { DatePicker } from "@/components/mock-ui/date-picker";
import { Input } from "@/components/mock-ui/input";
import { Segmented } from "@/components/mock-ui/layout";
import { Chip, StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import {
  useCreateTaskComment,
  useTaskActivity,
  useTaskComments,
  useTaskDetalhe,
} from "@/features/tasks/hooks/use-tasks";
import {
  useConcluirTask,
  useDescartarTask,
} from "@/features/tasks/hooks/use-tasks-da-intimacao";
import { useUpdateTask } from "@/features/tasks/hooks/use-update-task";
import type { TaskPriority } from "@/features/tasks/types";
import { formatarDataHora } from "@/lib/utils";

// Detalhe REAL da tarefa (GET /v1/tasks/:id + comentários/atividade), fiel ao design
// isTarefa: MAIN (título + abas Comentários/Atividade) à esquerda, ASIDE (Propriedades)
// à direita. Substitui o mock — consome o BE real. Nada de "IA" no texto (diretiva
// app-wide): a origem é comunicada pela ação ("derivada da intimação"), não pela tecnologia.

// display_status derivado do BE → tom do StatusBadge (o mesmo mapa da agenda de tarefas).
const TOM_STATUS: Record<string, Tom> = {
  Aberta: "neutral",
  "Em execução": "info",
  Concluída: "success",
  Atrasada: "danger",
};

// Prioridade: rótulo PT ↔ enum do BE, com a cor do dot (mesma paleta do detalhe mock).
const PRIORIDADE_LABEL: Record<TaskPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};
const PRIORIDADE_COR: Record<TaskPriority, string> = {
  HIGH: "var(--destructive)",
  MEDIUM: "var(--gold)",
  LOW: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
};
const PRIORIDADE_OPCOES: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
// Valor-sentinela do Select para "sem prioridade" (o Select não aceita value="").
const SEM_PRIORIDADE = "__none__";

// Status: as transições ALCANÇÁVEIS a partir de OPEN são Concluída (done) e Dispensada
// (dismiss); reabrir não existe no BE, então uma tarefa terminal só se mostra (sem opções).
const STATUS_ACAO = {
  done: { label: "Concluída", cor: "var(--success)" },
  dismiss: { label: "Dispensada", cor: "var(--muted-foreground)" },
} as const;

// Rótulos legíveis dos eventos do log de atividade (event_type do BE → PT).
const EVENTO_LABEL: Record<string, string> = {
  TASK_CREATED: "criou a tarefa",
  TITLE_CHANGED: "mudou o título",
  DESCRIPTION_CHANGED: "mudou a descrição",
  KIND_CHANGED: "mudou o tipo",
  PRIORITY_CHANGED: "mudou a prioridade",
  DUE_DATE_CHANGED: "mudou o vencimento",
  ASSIGNEE_CHANGED: "mudou o responsável",
  TASK_DONE: "concluiu a tarefa",
  TASK_DISMISSED: "dispensou a tarefa",
  COMMENTED: "comentou",
};

// A prioridade aparece no de/para da atividade como enum (HIGH…) — humaniza no log.
function humanizarValor(campo: string, valor: string): string {
  if (campo === "PRIORITY_CHANGED" && valor in PRIORIDADE_LABEL) {
    return PRIORIDADE_LABEL[valor as TaskPriority];
  }
  return valor;
}

// Código curto derivado do id (o read model não tem um "codigo" próprio) — TAR-XXXX.
function codigoCurto(id: string): string {
  return `TAR-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Detalhe no estilo Linear: título + conversa à esquerda, propriedades à direita. */
export function TarefaDetail({ id }: { id: string }) {
  const { data: t, isPending, error } = useTaskDetalhe(id);
  const comentarios = useTaskComments(id);
  const atividade = useTaskActivity(id);
  const { members, nameFor } = useOrgMembersDirectory();

  const update = useUpdateTask();
  const concluir = useConcluirTask();
  const descartar = useDescartarTask();
  const comentar = useCreateTaskComment(id);

  const [aba, setAba] = useState<"comentarios" | "atividade">("comentarios");
  const [rascunho, setRascunho] = useState("");

  if (isPending) {
    return (
      <div className="p-10">
        <div className="bg-muted h-8 w-80 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="p-10">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar esta tarefa. Tente novamente.
        </p>
      </div>
    );
  }

  const enviarComentario = () => {
    const texto = rascunho.trim();
    if (!texto) return;
    comentar.mutate(texto, { onSuccess: () => setRascunho("") });
  };

  const dueISO = t.due_date ? t.due_date.slice(0, 10) : "";

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-y-auto px-10 pt-8 pb-10">
        <div className="flex items-center gap-2.5">
          <Chip>{codigoCurto(t.id)}</Chip>
          {t.display_status ? (
            <StatusBadge tone={TOM_STATUS[t.display_status] ?? "neutral"}>
              {t.display_status}
            </StatusBadge>
          ) : null}
        </div>

        <h1 className="font-display mt-3.5 max-w-160 text-3xl leading-tight font-normal tracking-tight">
          {t.title}
        </h1>
        {t.description ? (
          <p className="mt-4 max-w-160 text-[15px] leading-relaxed text-pretty">
            {t.description}
          </p>
        ) : null}
        {t.intimation_id ? (
          <p className="text-muted-foreground mt-3 text-[12.5px]">
            Derivada da intimação · vinculada a{" "}
            <Link href={`/intimacoes/${t.intimation_id}`}>
              intimação de origem
            </Link>
          </p>
        ) : null}

        <div className="border-border mt-9 max-w-160 border-t pt-5">
          <Segmented
            valor={aba}
            onChange={setAba}
            opcoes={[
              {
                valor: "comentarios",
                label: "Comentários",
                contagem: String(comentarios.data?.length ?? 0),
              },
              { valor: "atividade", label: "Atividade" },
            ]}
          />

          {aba === "comentarios" ? (
            <div className="mt-5 flex flex-col gap-4.5">
              {comentarios.isPending ? (
                <div className="bg-muted h-14 animate-pulse rounded" />
              ) : (comentarios.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-[13.5px]">
                  Nenhum comentário ainda.
                </p>
              ) : (
                comentarios.data?.map((c) => {
                  const autor =
                    c.author_name || nameFor(c.author_user_id) || "Membro";
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[30px_minmax(0,1fr)] gap-3"
                    >
                      <Avatar nome={autor} size={30} />
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium">
                            {autor}
                          </span>
                          <span className="text-muted-foreground text-[11.5px] tabular-nums">
                            {formatarDataHora(c.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-pretty">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                <Avatar nome="Você" size={30} destaque />
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Escrever um comentário…"
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        enviarComentario();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="self-start"
                    disabled={!rascunho.trim() || comentar.isPending}
                    onClick={enviarComentario}
                  >
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              {atividade.isPending ? (
                <div className="bg-muted h-14 animate-pulse rounded" />
              ) : (atividade.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-[13.5px]">
                  Nenhuma atividade registrada.
                </p>
              ) : (
                <ul>
                  {atividade.data?.map((a) => {
                    const autor =
                      a.actor_name || nameFor(a.actor_user_id) || "Membro";
                    const de = a.from_value
                      ? humanizarValor(a.event_type, a.from_value)
                      : "";
                    const para = a.to_value
                      ? humanizarValor(a.event_type, a.to_value)
                      : "";
                    return (
                      <li
                        key={a.id}
                        className="border-border flex items-baseline justify-between gap-4 border-b py-2.5 text-[13px] last:border-0"
                      >
                        <span>
                          <span className="font-medium">{autor}</span>{" "}
                          {EVENTO_LABEL[a.event_type] ?? a.event_type}
                          {de && para ? (
                            <>
                              {" "}
                              de{" "}
                              <span className="line-through opacity-60">
                                {de}
                              </span>{" "}
                              para <span className="font-medium">{para}</span>
                            </>
                          ) : para ? (
                            <>
                              {" "}
                              para <span className="font-medium">{para}</span>
                            </>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11.5px] tabular-nums">
                          {formatarDataHora(a.created_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <aside className="border-border overflow-y-auto border-l px-6 pt-8 pb-10">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
          Propriedades
        </p>

        <div className="mt-3.5 flex flex-col">
          <Propriedade rotulo="Status">
            <Select
              value={t.status === "OPEN" ? "" : t.status}
              onValueChange={(v) => {
                if (v == null) return;
                if (v === "done") concluir.mutate(t.id);
                else if (v === "dismiss") descartar.mutate(t.id);
              }}
            >
              <SelectTrigger className="w-46" aria-label="Status da tarefa">
                <SelectValue placeholder={t.display_status || "Aberta"}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{
                        background:
                          t.status === "DONE"
                            ? STATUS_ACAO.done.cor
                            : t.status === "DISMISSED"
                              ? STATUS_ACAO.dismiss.cor
                              : "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
                      }}
                    />
                    {t.display_status ||
                      (t.status === "DISMISSED" ? "Dispensada" : "Aberta")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="done">
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ background: STATUS_ACAO.done.cor }}
                  />
                  {STATUS_ACAO.done.label}
                </SelectItem>
                <SelectItem value="dismiss">
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ background: STATUS_ACAO.dismiss.cor }}
                  />
                  {STATUS_ACAO.dismiss.label}
                </SelectItem>
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Responsável">
            <Select
              value={t.assignee_user_id ?? ""}
              onValueChange={(v) =>
                v != null &&
                update.updateTask({ id: t.id, patch: { assignee_user_id: v } })
              }
            >
              <SelectTrigger
                className="w-46"
                aria-label="Responsável pela tarefa"
              >
                <SelectValue placeholder="Ninguém" />
              </SelectTrigger>
              <SelectContent align="end">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name?.trim() || m.email?.split("@")[0] || m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Prioridade">
            <Select
              value={t.priority ?? SEM_PRIORIDADE}
              onValueChange={(v) =>
                v != null &&
                update.updateTask({
                  id: t.id,
                  patch: {
                    priority: v === SEM_PRIORIDADE ? "" : (v as TaskPriority),
                  },
                })
              }
            >
              <SelectTrigger className="w-46" aria-label="Prioridade da tarefa">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {t.priority ? (
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: PRIORIDADE_COR[t.priority] }}
                      />
                    ) : null}
                    {t.priority
                      ? PRIORIDADE_LABEL[t.priority]
                      : "Sem prioridade"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={SEM_PRIORIDADE}>Sem prioridade</SelectItem>
                {PRIORIDADE_OPCOES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: PRIORIDADE_COR[p] }}
                    />
                    {PRIORIDADE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Vencimento">
            <DatePicker
              valor={dueISO}
              onChange={(iso) =>
                update.updateTask({ id: t.id, patch: { due_date: iso } })
              }
            />
          </Propriedade>
        </div>

        {t.intimation_id ? (
          <>
            <p className="text-muted-foreground mt-7 text-[11px] font-medium tracking-[0.08em] uppercase">
              Origem
            </p>
            <div className="mt-3.5 flex flex-col">
              <Link
                href={`/intimacoes/${t.intimation_id}`}
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
