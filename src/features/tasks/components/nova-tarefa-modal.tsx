"use client";

// Modal "Nova tarefa" — cria uma tarefa manual (POST /v1/tasks via useCreateTask).
// Reusável: plugado sem contexto (tarefa avulsa, tela /tarefas) ou com contexto
// (court_record_id/intimation_id/deadline_id + responsável sugerido), a partir
// do cockpit do processo e do detalhe da intimação. Mesmo padrão de Dialog de
// nova-peca-modal.tsx; Select de responsável replica tarefa-detail.tsx (não usa
// o Menu popover de AtribuirResponsavelProcesso — aqui é campo de formulário).

import { useEffect, useState } from "react";

import { Dialog } from "@/components/mock-ui/dialog";
import { Input, Textarea } from "@/components/mock-ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";

import { useCreateTask } from "../hooks/use-create-task";
import type { TaskPriority } from "../types";
import { PRIORIDADE_COR, PRIORIDADE_LABEL } from "./tarefa-detail";

// Closed set — não há mapeamento de `kind` em lugar nenhum ainda (novo).
type TaskKind = "ANALISE" | "PECA" | "PROTOCOLO" | "PROVIDENCIA" | "CIENCIA";

const KIND_OPTIONS: { value: TaskKind; label: string }[] = [
  { value: "ANALISE", label: "Análise" },
  { value: "PECA", label: "Peça" },
  { value: "PROTOCOLO", label: "Protocolo" },
  { value: "PROVIDENCIA", label: "Providência" },
  { value: "CIENCIA", label: "Ciência" },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];

// Sentinelas do Select — o Select não aceita value="" (mesma convenção de tarefa-detail.tsx).
const SEM_TIPO = "__none__";
const SEM_PRIORIDADE = "__none__";
const SEM_RESPONSAVEL = "__none__";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  courtRecordId?: string;
  intimationId?: string;
  deadlineId?: string;
  assigneeUserIdSugerido?: string | null;
}

export function NovaTarefaModal({
  aberto,
  onFechar,
  courtRecordId,
  intimationId,
  deadlineId,
  assigneeUserIdSugerido,
}: Props) {
  const { members } = useOrgMembersDirectory();
  const { createTaskAsync, isPending, error } = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<TaskKind | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState(
    assigneeUserIdSugerido ?? "",
  );

  // Reseta o rascunho a cada abertura — não vazar dado de uma abertura pra outra.
  useEffect(() => {
    if (!aberto) return;
    setTitle("");
    setDescription("");
    setKind("");
    setPriority("");
    setDueDate("");
    setAssigneeUserId(assigneeUserIdSugerido ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const criar = async () => {
    if (!title.trim()) return;
    await createTaskAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      kind: kind || undefined,
      priority: priority || undefined,
      due_date: dueDate || undefined,
      assignee_user_id: assigneeUserId || undefined,
      court_record_id: courtRecordId,
      intimation_id: intimationId,
      deadline_id: deadlineId,
    });
    onFechar();
  };

  return (
    <Dialog aberto={aberto} titulo="Nova tarefa" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <div>
          <Rotulo>Título</Rotulo>
          <Input
            className="mt-2"
            placeholder="Ex.: Protocolar contestação"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Rotulo>Descrição</Rotulo>
          <Textarea
            className="mt-2"
            placeholder="Detalhes opcionais…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo>Tipo</Rotulo>
            <Select
              value={kind || SEM_TIPO}
              onValueChange={(v) => {
                if (v == null) return;
                setKind(v === SEM_TIPO ? "" : (v as TaskKind));
              }}
            >
              <SelectTrigger size="sm" className="mt-2 w-full">
                <SelectValue>
                  {kind
                    ? KIND_OPTIONS.find((o) => o.value === kind)?.label
                    : "Sem tipo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_TIPO}>Sem tipo</SelectItem>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Rotulo>Prioridade</Rotulo>
            <Select
              value={priority || SEM_PRIORIDADE}
              onValueChange={(v) => {
                if (v == null) return;
                setPriority(v === SEM_PRIORIDADE ? "" : (v as TaskPriority));
              }}
            >
              <SelectTrigger size="sm" className="mt-2 w-full">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {priority ? (
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ background: PRIORIDADE_COR[priority] }}
                      />
                    ) : null}
                    {priority ? PRIORIDADE_LABEL[priority] : "Sem prioridade"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_PRIORIDADE}>Sem prioridade</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
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
          </div>
        </div>

        <div>
          <Rotulo>Vencimento</Rotulo>
          <Input
            className="mt-2"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <Rotulo>Responsável</Rotulo>
          <Select
            value={assigneeUserId || SEM_RESPONSAVEL}
            onValueChange={(v) => {
              if (v == null) return;
              setAssigneeUserId(v === SEM_RESPONSAVEL ? "" : v);
            }}
          >
            <SelectTrigger size="sm" className="mt-2 w-full">
              <SelectValue placeholder="Ninguém" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_RESPONSAVEL}>Ninguém</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name?.trim() || m.email?.split("@")[0] || m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível criar a tarefa. Tente novamente.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={criar} disabled={!title.trim() || isPending}>
          {isPending ? "Criando…" : "Criar"}
        </Button>
      </div>
    </Dialog>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10.5px] font-medium tracking-[0.1em] uppercase">
      {children}
    </div>
  );
}
