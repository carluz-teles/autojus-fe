"use client";

import { CheckCircle2, History, Paperclip, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import {
  type ChecklistItem,
  ChecklistProgress,
} from "@/components/ui/checklist-progress";
import {
  DetailBody,
  DetailHeader,
  DetailLayout,
} from "@/components/ui/detail-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/ui/row-actions";
import { SheetField, SheetSection } from "@/components/ui/sheet";
import { StatusBadge, tarefaTone } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { formatDate } from "@/lib/format";

import { useTarefaItemActions } from "../hooks/use-tarefa-item-actions";
import { useTaskActions } from "../hooks/use-task-actions";
import { taskKindLabel, taskStatusLabel } from "../lib/labels";
import type { TaskDetailView } from "../types";

// TELA 3 — Detalhe da Tarefa (/tarefas/[id]) no design LEXIA. DetailLayout da Wave 0:
// breadcrumb + título + StatusBadge(display_status) + ações [Concluir tarefa]; abas
// Detalhes (real), Checklist (REAL — ChecklistProgress + toggle/add via mutations),
// Anexos/Histórico placeholders. Componente = binding: estados e ações vêm dos hooks.
export function TarefaDetalhe({ tarefa }: { tarefa: TaskDetailView }) {
  const { nameFor } = useOrgMembersDirectory();
  const { markDone } = useTaskActions();
  const { toggle, add } = useTarefaItemActions(tarefa.id);
  const [newTitle, setNewTitle] = useState("");

  const statusLabel = taskStatusLabel(tarefa);
  const isDone = tarefa.status === "DONE";
  const kind = taskKindLabel(tarefa.kind);

  // Itens do BE → forma do ChecklistProgress (data de conclusão já formatada).
  const items: ChecklistItem[] = tarefa.items.map((it) => ({
    id: it.id,
    label: it.title,
    done: it.done,
    date: it.done_at ? formatDate(it.done_at) : undefined,
  }));

  const onToggle = (id: string) => {
    const current = tarefa.items.find((it) => it.id === id);
    if (!current || toggle.isPending) return;
    toggle.mutate({ itemId: id, done: !current.done });
  };

  const onAdd = () => {
    const title = newTitle.trim();
    if (!title || add.isPending) return;
    add.mutate(title, { onSuccess: () => setNewTitle("") });
  };

  const breadcrumb = useMemo(
    () => [{ label: "Tarefas", href: "/tarefas" }, { label: tarefa.title }],
    [tarefa.title],
  );
  useSetBreadcrumb(breadcrumb);

  return (
    <DetailLayout
      header={
        <DetailHeader
          title={tarefa.title}
          status={
            <StatusBadge label={statusLabel} tone={tarefaTone(statusLabel)} />
          }
          subtitle={kind ?? undefined}
          actions={
            <>
              <Button
                size="sm"
                disabled={
                  isDone || tarefa.status === "DISMISSED" || markDone.isPending
                }
                onClick={() => markDone.mutate(tarefa.id)}
              >
                <CheckCircle2 />
                {isDone ? "Concluída" : "Concluir tarefa"}
              </Button>
              <RowActions label="Mais ações" />
            </>
          }
        />
      }
    >
      <Tabs defaultValue="detalhes">
        <TabsList aria-label="Abas da tarefa">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4">
          <DetailBody
            aside={
              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Prazo" emphasis>
                  {formatDate(tarefa.due_date)}
                </SheetField>
                <SheetField label="Responsável">
                  {nameFor(tarefa.assignee_user_id) ?? "—"}
                </SheetField>
                <SheetField label="Prioridade">—</SheetField>
                <SheetField label="Origem">{tarefa.source || "—"}</SheetField>
              </dl>
            }
          >
            <div className="flex flex-col gap-6">
              <SheetSection title="Descrição">
                {tarefa.description ? (
                  <p className="whitespace-pre-line">{tarefa.description}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Esta tarefa não tem descrição.
                  </p>
                )}
              </SheetSection>

              <SheetSection title="Peça vinculada">
                <p className="text-muted-foreground">
                  A vinculação de peças chega numa fatia futura.
                </p>
              </SheetSection>
            </div>
          </DetailBody>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <div className="bg-card ring-foreground/10 flex max-w-xl flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
            {items.length > 0 ? (
              <ChecklistProgress items={items} onToggle={onToggle} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum item ainda. Adicione o primeiro passo abaixo.
              </p>
            )}

            <form
              className="flex items-center gap-2 border-t pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                onAdd();
              }}
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Adicionar item ao checklist…"
                aria-label="Novo item do checklist"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newTitle.trim() || add.isPending}
              >
                <Plus /> Adicionar
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="anexos" className="mt-4">
          <EmptyState
            icon={Paperclip}
            title="Nenhum anexo"
            description="Os anexos desta tarefa aparecem aqui."
            phase="Chega numa próxima fatia"
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <EmptyState
            icon={History}
            title="Sem histórico ainda"
            description="As mudanças desta tarefa aparecem aqui."
            phase="Chega numa próxima fatia"
          />
        </TabsContent>
      </Tabs>
    </DetailLayout>
  );
}
