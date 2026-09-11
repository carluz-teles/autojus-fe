"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { PageFrame, ShellBackLink } from "@/components/shell/page-frame";
import { TeorContent } from "@/components/teor-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { usePartes } from "@/features/processos/hooks/use-processos";
import { useApi } from "@/lib/api/use-api";
import { formatDate } from "@/lib/format";

import { useActionItemDetalhe } from "../hooks/use-action-items";
import { useProvidenciaFlow } from "../hooks/use-providencia-flow";
import { useWorkMutation } from "../hooks/use-workspace";
import { STATUS_LABEL } from "../lib/status-pill";
import type { ActionItemPriority, ActionItemView } from "../types";
import { InternalDueDate } from "./internal-due-date";
import { NewProvidencia, PIECE_PROFILES, WORK_TYPES } from "./new-providencia";
import {
  ProvidenciaNextStep,
  ProvidenciaPiece,
  ProvidenciaSteps,
} from "./providencia-flow";
import { ProvidenciaFulfillment } from "./providencia-fulfillment";
import { WorkActions } from "./work-actions";

export function ProvidenciaDetail({ id }: { id: string }) {
  const query = useActionItemDetalhe(id);
  const p = query.data;
  return (
    <PageFrame
      header={
        <>
          <ShellBackLink href="/pipeline" label="Voltar às providências" />
          <h1 className="shrink-0 text-[13px] font-medium">Providência</h1>
        </>
      }
    >
      {query.isPending ? (
        <div className="p-6">
          <Skeleton className="h-8 w-64" />
        </div>
      ) : query.error || !p ? (
        <div className="flex flex-col items-start gap-4 p-6">
          <p role="alert">Não foi possível carregar esta providência.</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <WorkDetailContent key={p.id} p={p} />
      )}
    </PageFrame>
  );
}

function WorkDetailContent({ p }: { p: ActionItemView }) {
  const flow = useProvidenciaFlow(p);
  const directory = useOrgMembersDirectory();
  const parties = usePartes(p.court_record_id || "");
  const save = useWorkMutation();
  const [edit, setEdit] = useState(false);
  const [classification, setClassification] = useState(false);
  const terminal = ["DONE", "CANCELLED", "DISMISSED"].includes(p.status);
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 p-4 sm:p-6">
      <section className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
            {p.tipo_status === "a_confirmar" && (
              <Badge variant="warning">Tipo a revisar</Badge>
            )}
          </div>
          <h2 className="font-display text-2xl leading-tight tracking-tight break-words sm:text-3xl">
            {p.title}
          </h2>
          <p className="text-muted-foreground text-sm">
            {p.process_title || "Processo vinculado"}
            {p.cnj_number ? ` · ${formatarCNJ(p.cnj_number)}` : ""}
          </p>
        </div>
        {p.intimation_id ? (
          <Link
            className="text-primary inline-flex shrink-0 items-center gap-2 text-xs underline-offset-4 hover:underline"
            href={detalheNaFila(p.intimation_id, `/providencias/${p.id}`)}
          >
            Intimação de origem
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </section>
      <ProvidenciaSteps item={p} evidence={flow.evidence} />
      <ProvidenciaFulfillment fulfillment={p.fulfillment} />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <ProvidenciaNextStep
            item={p}
            evidence={flow.evidence}
            refreshing={flow.refreshing}
            onRefresh={flow.refresh}
          >
            <WorkActions
              item={p}
              onReviewType={() => setClassification(true)}
            />
          </ProvidenciaNextStep>
          <ProvidenciaPiece
            item={p}
            evidence={flow.evidence}
            creatorName={directory.nameFor(flow.evidence.draft?.created_by)}
          />
          <section className="surface-panel flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">Execução</p>
                <h2 className="font-display mt-1 text-xl font-medium">
                  O que precisa ser feito
                </h2>
              </div>
              <IconAction
                icon={Pencil}
                label="Editar providência"
                onClick={() => setEdit(true)}
              />
            </div>
            <TeorContent
              content={p.description}
              emptyMessage="Adicione orientações para executar esta providência."
            />
          </section>
          <Tabs
            defaultValue="context"
            className="surface-panel overflow-hidden"
          >
            <TabsList>
              <TabsTrigger value="context">Contexto</TabsTrigger>
              <TabsTrigger value="activity">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent
              value="context"
              className="m-0 px-5 pb-5 sm:px-6 sm:pb-6"
            >
              <div className="flex flex-col gap-5 pt-5">
                <section className="flex flex-col gap-2">
                  <h2 className="font-display text-lg font-medium">Processo</h2>
                  <Link
                    className="text-primary inline-flex items-center gap-2 text-sm underline underline-offset-4"
                    href={`/processos/${p.court_record_id}`}
                  >
                    {formatarCNJ(p.cnj_number || "") || "Abrir processo"}
                    <ArrowUpRight className="size-4" />
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {p.process_title} · {p.court}
                  </p>
                  {parties.data && (
                    <div className="text-sm">
                      <p>
                        <span className="text-muted-foreground">
                          Polo ativo:{" "}
                        </span>
                        {parties.data.autor.map((x) => x.name).join(", ") ||
                          "Não informado"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Polo passivo:{" "}
                        </span>
                        {parties.data.reu.map((x) => x.name).join(", ") ||
                          "Não informado"}
                      </p>
                    </div>
                  )}
                  {p.court_record_id && (
                    <div className="mt-2">
                      <NewProvidencia
                        processId={p.court_record_id}
                        intimationId={p.intimation_id}
                        disabled={p.origin_review_required}
                      />
                    </div>
                  )}
                </section>
                {p.intimation_id ? (
                  <section className="flex flex-col gap-2 border-t pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-medium">Intimação de origem</h2>
                      <Link
                        className="text-primary text-sm underline"
                        href={detalheNaFila(
                          p.intimation_id,
                          `/providencias/${p.id}`,
                        )}
                      >
                        Abrir intimação
                      </Link>
                    </div>
                    <TeorContent
                      content={p.intimation_text}
                      emptyMessage="Consulte o documento na intimação de origem."
                      className="max-h-80 overflow-y-auto"
                    />
                  </section>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Providência criada manualmente no processo.
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent
              value="activity"
              className="m-0 px-5 pb-5 sm:px-6 sm:pb-6"
            >
              {p.activity?.length === 100 && (
                <p className="text-muted-foreground text-xs">
                  Últimas 100 alterações.
                </p>
              )}
              <ol className="divide-y pt-4">
                {p.activity?.length ? (
                  p.activity.map((event) => (
                    <li key={event.id} className="flex flex-col gap-1 py-4">
                      <p className="text-sm">
                        {event.kind === "created"
                          ? "Providência criada"
                          : Object.keys(event.changes)
                              .map(
                                (key) =>
                                  ({
                                    title: "Título",
                                    description: "Descrição",
                                    status: "Status",
                                    assignee_user_id: "Responsável",
                                    due_date: "Entrega interna",
                                    priority: "Prioridade",
                                    tipo: "Tipo",
                                    tipo_status: "Revisão do tipo",
                                    piece_profile_key: "Tipo de peça",
                                  })[key] || key,
                              )
                              .join(", ") + " atualizado"}
                      </p>
                      {event.kind !== "created" && (
                        <dl className="flex flex-col gap-2">
                          {Object.entries(event.changes).map(
                            ([key, change]) => (
                              <div key={key} className="text-xs">
                                <dt className="font-medium">
                                  {ACTIVITY_FIELDS[key] || key}
                                </dt>
                                <dd className="text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                                  {activityValue(
                                    key,
                                    change.before,
                                    directory.nameFor,
                                  )}{" "}
                                  →{" "}
                                  {activityValue(
                                    key,
                                    change.after,
                                    directory.nameFor,
                                  )}
                                </dd>
                              </div>
                            ),
                          )}
                        </dl>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {event.actor_user_id
                          ? directory.nameFor(event.actor_user_id) ||
                            "Membro do escritório"
                          : "Sistema"}{" "}
                        · {new Date(event.created_at).toLocaleString("pt-BR")}
                      </p>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground py-5 text-sm">
                    As próximas alterações serão registradas aqui.
                  </li>
                )}
              </ol>
            </TabsContent>
          </Tabs>
        </div>
        <aside className="surface-panel flex min-w-0 flex-col gap-5 p-5 lg:sticky lg:top-4 lg:self-start">
          <section className="flex flex-col gap-2">
            <h2 className="section-label">Prazo judicial vinculado</h2>
            <p className="text-lg font-medium">
              {p.judicial_due_date
                ? formatDate(p.judicial_due_date)
                : "Sem prazo judicial vinculado"}
            </p>
            {p.judicial_due_date && (
              <p className="text-muted-foreground text-xs">
                {p.judicial_status === "OPEN" || p.judicial_status === "PENDING"
                  ? "Prazo ativo · confira a contagem na intimação."
                  : "Prazo encerrado ou sem obrigação ativa."}
              </p>
            )}
            {p.judicial_review_status === "a_confirmar" && (
              <Badge variant="warning">Prazo a revisar</Badge>
            )}
          </section>
          <Field>
            <FieldLabel>Entrega interna</FieldLabel>
            <div
              aria-busy={save.isPending}
              className={save.isPending ? "pointer-events-none opacity-60" : ""}
            >
              <InternalDueDate
                disabled={save.isPending}
                valor={p.due_date?.slice(0, 10) || ""}
                onChange={(date) =>
                  save.mutate({ id: p.id, patch: { due_date: date } })
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Data de organização do trabalho. Não altera o prazo judicial.
            </p>
          </Field>
          <Field>
            <FieldLabel>Responsável</FieldLabel>
            <ResponsavelMenu
              value={p.assignee_user_id}
              nome={directory.nameFor(p.assignee_user_id)}
              membros={directory.members}
              emVoo={save.isPending}
              onAssign={(value) =>
                save.mutate({
                  id: p.id,
                  patch: { assignee_user_id: value || "" },
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="work-priority">Prioridade</FieldLabel>
            <NativeSelect
              id="work-priority"
              disabled={save.isPending}
              value={p.priority || ""}
              onChange={(e) =>
                save.mutate({
                  id: p.id,
                  patch: {
                    priority: e.target.value as ActionItemPriority | "",
                  },
                })
              }
            >
              <option value="">Sem prioridade</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </NativeSelect>
          </Field>
          <section className="flex flex-col gap-2 border-t pt-4">
            <h2 className="section-label">Tipo de providência</h2>
            <p className="text-sm">{WORK_TYPES[p.tipo]}</p>
            <p className="text-muted-foreground text-xs">
              {PIECE_PROFILES[p.piece_profile_key || ""]}
            </p>
            {!terminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClassification(true)}
              >
                Ajustar tipo
              </Button>
            )}
          </section>
          {save.isError && (
            <p role="alert" className="text-destructive text-xs">
              Não foi possível salvar a alteração. Tente novamente.
            </p>
          )}
        </aside>
      </div>
      <Sheet open={edit} onOpenChange={setEdit}>
        <EditWork p={p} open={edit} onSaved={() => setEdit(false)} />
      </Sheet>
      <Sheet open={classification} onOpenChange={setClassification}>
        <EditClassification p={p} onSaved={() => setClassification(false)} />
      </Sheet>
    </div>
  );
}
function EditWork({
  p,
  open,
  onSaved,
}: {
  p: ActionItemView;
  open: boolean;
  onSaved: () => void;
}) {
  const id = useId();
  const save = useWorkMutation();
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description || "");
  useEffect(() => {
    const dirty = title !== p.title || description !== (p.description || "");
    if (!dirty || !open) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [title, description, p.title, p.description, open]);
  return (
    <SheetContent
      title="Editar providência"
      footer={
        <Button form={id} type="submit" disabled={save.isPending}>
          Salvar alterações
        </Button>
      }
    >
      <form
        id={id}
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending)
            save.mutate(
              { id: p.id, patch: { title, description } },
              { onSuccess: onSaved },
            );
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-title`}>Título</FieldLabel>
            <Input
              id={`${id}-title`}
              required
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-description`}>Descrição</FieldLabel>
            <Textarea
              id={`${id}-description`}
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          {save.isError && (
            <p role="alert">
              Não foi possível salvar. Suas alterações foram mantidas.
            </p>
          )}
        </FieldGroup>
      </form>
    </SheetContent>
  );
}
function EditClassification({
  p,
  onSaved,
}: {
  p: ActionItemView;
  onSaved: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [tipo, setTipo] = useState(p.tipo);
  const [profile, setProfile] = useState(
    p.intimation_id ? p.piece_profile_key || "" : "",
  );
  const save = useMutation({
    mutationFn: () =>
      api(`/v1/action-items/${p.id}/reclassificar`, {
        method: "POST",
        body: { tipo, piece_profile_key: profile },
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["action-items"] }),
        qc.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
      onSaved();
    },
  });
  return (
    <SheetContent
      title="Ajustar tipo da providência"
      description="Ao salvar, você confirma a classificação deste trabalho."
      footer={
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          Salvar e confirmar tipo
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="classification-type">Tipo</FieldLabel>
          <NativeSelect
            id="classification-type"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
          >
            {Object.entries(WORK_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {p.intimation_id ? (
          <Field>
            <FieldLabel htmlFor="classification-profile">Peça</FieldLabel>
            <NativeSelect
              id="classification-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            >
              {Object.entries(PIECE_PROFILES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <p className="text-muted-foreground text-sm">
            Para construir uma peça, crie a providência dentro da intimação de
            origem.
          </p>
        )}
        {p.draft_id && (
          <p className="text-muted-foreground text-sm">
            Alterar o tipo substitui a versão vigente da peça. A versão anterior
            será preservada no histórico. Peças protocoladas não podem ser
            reclassificadas.
          </p>
        )}
        {save.isError && (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível alterar o tipo. Confira se a peça já foi
            protocolada.
          </p>
        )}
      </FieldGroup>
    </SheetContent>
  );
}

const ACTIVITY_FIELDS: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  status: "Status",
  assignee_user_id: "Responsável",
  due_date: "Entrega interna",
  priority: "Prioridade",
  tipo: "Tipo",
  tipo_status: "Revisão do tipo",
  piece_profile_key: "Tipo de peça",
};
function activityValue(
  key: string,
  value: unknown,
  nameFor: (id?: string | null) => string | null | undefined,
) {
  if (value === null || value === undefined || value === "")
    return "Não definido";
  const text = String(value);
  if (key === "status")
    return STATUS_LABEL[text as keyof typeof STATUS_LABEL] || text;
  if (key === "assignee_user_id")
    return nameFor(text) || "Membro do escritório";
  if (key === "due_date") return formatDate(text);
  if (key === "priority")
    return { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" }[text] || text;
  if (key === "tipo")
    return WORK_TYPES[text as keyof typeof WORK_TYPES] || text;
  if (key === "piece_profile_key") return PIECE_PROFILES[text] || text;
  if (key === "tipo_status")
    return text === "confiavel" ? "Confirmado" : "A revisar";
  return text;
}
