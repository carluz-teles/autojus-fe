"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import type { PageEnvelope } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

import { useWorkMutation } from "../hooks/use-workspace";
import type { ActionItemTipo, CreateWorkInput } from "../types";
import { InternalDueDate } from "./internal-due-date";

export const WORK_TYPES: Record<ActionItemTipo, string> = {
  cumprir: "Cumprir determinação",
  ciencia: "Tomar ciência",
  manifestar: "Manifestar-se",
  contestar: "Contestar",
  recorrer: "Recorrer",
};
export const PIECE_PROFILES: Record<string, string> = {
  "": "Não precisa de peça",
  manifestacao: "Manifestação",
  contestacao: "Contestação",
  apelacao: "Apelação",
  peticao_inicial: "Petição inicial",
};

export function NewProvidencia({
  processId = "",
  intimationId = "",
  onCreated,
}: {
  processId?: string;
  intimationId?: string;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nova providência
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <NewProvidenciaForm
          processId={processId}
          intimationId={intimationId}
          open={open}
          onSaved={(id) => {
            setOpen(false);
            onCreated?.(id);
          }}
        />
      </Sheet>
    </>
  );
}

function NewProvidenciaForm({
  processId,
  intimationId,
  open,
  onSaved,
}: {
  processId: string;
  intimationId: string;
  open: boolean;
  onSaved: (id: string) => void;
}) {
  const uid = useId();
  const api = useApi();
  const directory = useOrgMembersDirectory();
  const save = useWorkMutation();
  const [search, setSearch] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<{
    id: string;
    cnj_number: string;
    class?: string;
  } | null>(null);
  const [form, setForm] = useState<CreateWorkInput>({
    court_record_id: processId,
    intimation_id: intimationId,
    title: "",
    description: "",
    tipo: "cumprir",
    piece_profile_key: "",
    assignee_user_id: "",
    priority: "",
    due_date: "",
  });
  const debouncedSearch = useDebounce(search, 300);
  const processes = useQuery({
    queryKey: ["processos", "work-picker", debouncedSearch],
    enabled: open && !processId,
    queryFn: ({ signal }) =>
      api<PageEnvelope<{ id: string; cnj_number: string; class?: string }>>(
        "/v1/processos",
        { signal, query: { search: debouncedSearch, limit: 30 } },
      ),
  });
  const patch = (value: Partial<CreateWorkInput>) =>
    setForm((previous) => ({ ...previous, ...value }));
  return (
    <SheetContent
      title="Nova providência"
      description={
        intimationId
          ? "Vinculada a esta intimação e ao processo."
          : "Defina o trabalho a realizar neste processo."
      }
      footer={
        <Button type="submit" form={uid} disabled={save.isPending}>
          {save.isPending && (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          )}
          Criar providência
        </Button>
      }
    >
      <form
        id={uid}
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending) return;
          save.mutate(
            {
              create: {
                ...form,
                court_record_id: processId || form.court_record_id,
              },
            },
            {
              onSuccess: (result) => {
                patch({ title: "", description: "" });
                onSaved(result.id);
              },
            },
          );
        }}
      >
        <fieldset disabled={save.isPending}>
          <FieldGroup>
            {!processId && (
              <Field>
                <FieldLabel htmlFor={`${uid}-search`}>Processo</FieldLabel>
                <Input
                  id={`${uid}-search`}
                  type="search"
                  placeholder="Buscar por CNJ ou nome…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <NativeSelect
                  aria-label="Selecionar processo"
                  required
                  value={form.court_record_id}
                  onChange={(e) => {
                    patch({ court_record_id: e.target.value });
                    setSelectedProcess(
                      processes.data?.data.find(
                        (p) => p.id === e.target.value,
                      ) ?? null,
                    );
                  }}
                >
                  <option value="">Selecione o processo</option>
                  {selectedProcess &&
                    !processes.data?.data.some(
                      (p) => p.id === selectedProcess.id,
                    ) && (
                      <option value={selectedProcess.id}>
                        {formatarCNJ(selectedProcess.cnj_number)} ·{" "}
                        {selectedProcess.class || "Processo"}
                      </option>
                    )}
                  {processes.data?.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatarCNJ(p.cnj_number || "")} ·{" "}
                      {p.class || "Processo"}
                    </option>
                  ))}
                </NativeSelect>
                {processes.isError && (
                  <p role="alert">
                    Não foi possível buscar processos. Tente novamente.
                  </p>
                )}
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={`${uid}-title`}>
                O que precisa ser feito?
              </FieldLabel>
              <Input
                id={`${uid}-title`}
                name="title"
                required
                maxLength={300}
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Ex.: Conferir documentos do cliente…"
                disabled={save.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-description`}>Descrição</FieldLabel>
              <Textarea
                id={`${uid}-description`}
                name="description"
                maxLength={10000}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Orientações para executar a providência…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-type`}>
                Tipo de providência
              </FieldLabel>
              <NativeSelect
                id={`${uid}-type`}
                value={form.tipo}
                onChange={(e) =>
                  patch({ tipo: e.target.value as ActionItemTipo })
                }
              >
                {Object.entries(WORK_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {intimationId ? (
              <Field>
                <FieldLabel htmlFor={`${uid}-piece`}>Peça</FieldLabel>
                <NativeSelect
                  id={`${uid}-piece`}
                  value={form.piece_profile_key}
                  onChange={(e) => patch({ piece_profile_key: e.target.value })}
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
                Para construir uma peça, crie a providência dentro da intimação
                de origem.
              </p>
            )}
            <Field>
              <FieldLabel>Responsável</FieldLabel>
              <ResponsavelMenu
                value={form.assignee_user_id}
                nome={directory.nameFor(form.assignee_user_id)}
                membros={directory.members}
                emVoo={save.isPending}
                onAssign={(id) => patch({ assignee_user_id: id || "" })}
              />
            </Field>
            <Field>
              <FieldLabel>Entrega interna</FieldLabel>
              <InternalDueDate
                disabled={save.isPending}
                valor={form.due_date}
                onChange={(date) => patch({ due_date: date })}
              />
              <p className="text-muted-foreground text-xs">
                Opcional. O prazo judicial vinculado permanece separado.
              </p>
            </Field>
            {save.isError && (
              <p role="alert" className="text-destructive text-sm">
                Não foi possível criar a providência. Seus dados foram mantidos.
              </p>
            )}
          </FieldGroup>
        </fieldset>
      </form>
    </SheetContent>
  );
}
