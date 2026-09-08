"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Paperclip,
  Send,
  Trash2,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { listCertificados } from "@/features/configuracoes/services/certificado.service";
import { PdfPreview } from "@/features/pecas-v2/components/construction/pdf-preview";
import { useApi } from "@/lib/api/use-api";

type Choice = { id: string; label: string };
type DocumentType = { cdTipoDocumento: number; deTipoDocumento: string };
type PreparationContext = {
  session_id: string;
  mfa_required: boolean;
  processes: Choice[];
  classes: Choice[];
  parties: Choice[];
  party_types: Choice[];
  document_types: DocumentType[];
  max_pdf_bytes: number;
  suggested_party_id?: string;
};
type Preparation = {
  id: string;
  cnj: string;
  status: "QUEUED" | "PREPARING" | "PREPARED" | "CHECK_REQUIRED";
  phase: string;
  queued_at?: string;
  started_at?: string;
  finished_at?: string;
  can_resume: boolean;
  portal_url?: string;
  message: string;
  documents: {
    id: string;
    name: string;
    type_label: string;
    bytes: number;
    principal: boolean;
  }[];
};

function ChoiceField({
  id,
  label,
  value,
  choices,
  onChange,
  disabled,
  compact = false,
  onEdit,
}: {
  id: string;
  label: string;
  value: string;
  choices: Choice[];
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  onEdit?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const selected = choices.find((choice) => choice.id === value);
  if (compact && selected && !editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 text-sm break-words">{selected.label}</p>
        </div>
        {(choices.length > 1 || onEdit) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={`Alterar ${label.toLocaleLowerCase()}`}
            onClick={() => {
              setEditing(true);
              onEdit?.();
            }}
          >
            Alterar
          </Button>
        )}
      </div>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setEditing(false);
        }}
        className="w-full"
      >
        <NativeSelectOption value="">Selecione…</NativeSelectOption>
        {choices.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function PreparationWorkspace({
  draftId,
  cnj,
  pieceType,
  beforePrepare,
  disabled,
  onOpenAttachments,
  children,
}: {
  draftId: string;
  cnj: string;
  pieceType: string;
  beforePrepare: () => Promise<void>;
  disabled?: boolean;
  onOpenAttachments: () => void;
  children: (slots: {
    trigger: ReactNode;
    attachments: ReactNode;
    status: ReactNode;
  }) => ReactNode;
}) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [certificateTime, setCertificateTime] = useState(() => Date.now());
  const [certificate, setCertificate] = useState("");
  const [number, setNumber] = useState(cnj);
  const [context, setContext] = useState<PreparationContext | null>(null);
  const [process, setProcess] = useState("");
  const [classCode, setClassCode] = useState("");
  const [filter, setFilter] = useState(
    pieceType === "MOTION" || pieceType === "OTHER"
      ? "Petição Intermediária"
      : "",
  );
  const [selectedFilter, setSelectedFilter] = useState("");
  const [editingClass, setEditingClass] = useState(false);
  const [party, setParty] = useState("");
  const [partyType, setPartyType] = useState("");
  const [principalType, setPrincipalType] = useState("");
  const [fee, setFee] = useState("");
  const [resume, setResume] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [mfa, setMfa] = useState("");
  const [files, setFiles] = useState<{ file: File; type: string }[]>([]);
  const [fileError, setFileError] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const certificates = useQuery({
    queryKey: ["certificates", "filing"],
    queryFn: () => listCertificados(fetcher),
    enabled: open,
  });
  const statusKey = ["filing-preparation", draftId];
  const status = useQuery({
    queryKey: statusKey,
    queryFn: async () =>
      (
        await fetcher<{ data: Preparation | null }>(
          `/v1/pecas/${draftId}/filing/preparation`,
        )
      ).data,
    refetchInterval: (q) =>
      q.state.data?.status === "QUEUED" || q.state.data?.status === "PREPARING"
        ? 5000
        : false,
  });
  const connect = useMutation({
    mutationFn: async (overrides: Record<string, unknown>) => {
      const r = await fetcher<{ data: PreparationContext }>(
        `/v1/pecas/${draftId}/filing/preparation/context`,
        {
          method: "POST",
          body: {
            certificate_id: certificate,
            cnj: number || status.data?.cnj,
            session_id: context?.session_id,
            process_code: process,
            class_filter: filter,
            class_code: Number(classCode),
            ...overrides,
          },
        },
      );
      return r.data;
    },
    onSuccess: (result) => {
      setContext(result);
      setMfa("");
      if (result.mfa_required) return;
      if (!process && result.processes.length === 1) {
        const id = result.processes[0].id;
        setProcess(id);
        connect.mutate({ session_id: result.session_id, process_code: id });
        return;
      }
      if (!party && result.suggested_party_id)
        setParty(result.suggested_party_id);
      if (result.party_types.length === 1)
        setPartyType(result.party_types[0].id);
      const main = result.document_types.filter(
        (d) => d.deTipoDocumento === "Petição",
      );
      if (main.length === 1 && !principalType)
        setPrincipalType(String(main[0].cdTipoDocumento));
      const exact = result.classes.filter(
        (c) =>
          c.label.replace(/^\d+\s*-\s*/, "").toLocaleLowerCase() ===
          filter.toLocaleLowerCase(),
      );
      if (!classCode && exact.length === 1) {
        setClassCode(exact[0].id);
        setSelectedFilter(filter);
        connect.mutate({
          session_id: result.session_id,
          class_code: Number(exact[0].id),
        });
      }
    },
  });
  const prepare = useMutation({
    mutationFn: async () => {
      await beforePrepare();
      const data = new FormData();
      data.append(
        "metadata",
        JSON.stringify({
          simulation: true,
          resume,
          session_id: context?.session_id,
          process_code: process,
          class_code: Number(classCode),
          class_filter: selectedFilter,
          party_id: party,
          party_type_code: Number(partyType),
          principal_type_code: Number(principalType),
          fee_option: fee,
          attachment_types: resume ? [] : files.map((f) => Number(f.type)),
        }),
      );
      if (!resume) files.forEach((f) => data.append("attachments", f.file));
      return (
        await fetcher<{ data: Preparation }>(
          `/v1/pecas/${draftId}/filing/preparation`,
          { method: "POST", formData: data },
        )
      ).data;
    },
    onSuccess: (result) => {
      qc.setQueryData(statusKey, result);
      setResume(false);
      setOpen(false);
      toast.success(
        result.status === "QUEUED"
          ? "Solicitação na fila"
          : "Solicitação já registrada",
        {
          description:
            "Você pode continuar usando a plataforma e acompanhar o resultado na peça.",
        },
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: statusKey }),
  });
  const busy = connect.isPending || prepare.isPending;
  const documentChoices =
    context?.document_types.map((d) => ({
      id: String(d.cdTipoDocumento),
      label: d.deTipoDocumento,
    })) ?? [];
  const error = prepare.error ?? connect.error ?? status.error;
  const result = status.data;
  const courtNumber = number || result?.cnj || "";
  const locked =
    busy ||
    result?.status === "QUEUED" ||
    result?.status === "PREPARING" ||
    result?.status === "PREPARED";
  const ready =
    !!context &&
    !context.mfa_required &&
    !!process &&
    !!classCode &&
    !!party &&
    !!partyType &&
    !!principalType &&
    !!fee &&
    (resume || files.every((f) => !!f.type));
  const openAttachments = () => {
    setOpen(false);
    onOpenAttachments();
  };
  const certificateChoices = (certificates.data?.data ?? [])
    .filter(
      (c) =>
        !c.revoked_at &&
        Date.parse(c.not_after) > certificateTime &&
        Date.parse(c.not_before) <= certificateTime,
    )
    .map((c) => ({
      id: c.id,
      label: c.subject_cn.split(":")[0] + " · " + (c.oab || "A1"),
    }));
  const showResult = !!result && !resume;
  const statusLabel =
    result?.status === "QUEUED"
      ? "Na fila"
      : result?.status === "PREPARING"
        ? "Em processamento"
        : result?.status === "PREPARED"
          ? "Pronto para conferir"
          : "Precisa de atenção";
  const statusDescription =
    result?.status === "QUEUED"
      ? "Aguardando o início da execução. Você pode sair desta tela; avisaremos quando terminar."
      : result?.status === "PREPARING"
        ? "Preparando a peça e os anexos no e-SAJ. Você pode continuar usando a plataforma."
        : result?.message;
  const StatusIcon =
    result?.status === "QUEUED"
      ? Clock3
      : result?.status === "PREPARING"
        ? LoaderCircle
        : result?.status === "PREPARED"
          ? CheckCircle2
          : CircleAlert;
  const progress = result ? (
    <div
      role="status"
      className="bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 text-sm"
    >
      <StatusIcon className="text-primary size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Simulação de peticionamento · {statusLabel}
        </p>
        <p className="text-muted-foreground text-xs">{statusDescription}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Acompanhar solicitação
      </Button>
    </div>
  ) : null;
  const trigger = (
    <Popover
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          setOpen(v);
          if (v) setCertificateTime(Date.now());
        }
      }}
    >
      <PopoverTrigger render={<Button size="sm" disabled={disabled} />}>
        <Send data-icon="inline-start" />
        {result ? statusLabel : "Protocolar"}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[min(720px,calc(100dvh-32px))] w-[min(400px,calc(100vw-24px))] gap-3 overflow-y-auto p-4"
      >
        <PopoverHeader>
          <PopoverTitle>Preparar peticionamento</PopoverTitle>
          <PopoverDescription>
            Conecte o certificado para preparar a peça e os anexos no e-SAJ.
          </PopoverDescription>
        </PopoverHeader>
        <Badge variant="outline">Simulação · sem envio definitivo</Badge>
        {!showResult && (
          <>
            <ChoiceField
              compact
              onEdit={() => {}}
              id="filing-certificate"
              label="Certificado A1"
              value={certificate}
              choices={certificateChoices}
              disabled={busy}
              onChange={(v) => {
                setCertificate(v);
                setContext(null);
                setProcess("");
                setClassCode("");
                setParty("");
                setPartyType("");
                setPrincipalType("");
                connect.reset();
                if (v && courtNumber)
                  connect.mutate({
                    certificate_id: v,
                    session_id: "",
                    process_code: "",
                    class_code: 0,
                  });
              }}
            />
            {certificates.isPending && (
              <p role="status">Carregando certificados…</p>
            )}
            {certificates.isError && (
              <p role="alert">Não foi possível carregar os certificados.</p>
            )}
            {certificates.data && certificateChoices.length === 0 && (
              <a href="/configuracoes" className="text-primary underline">
                Cadastrar certificado
              </a>
            )}
            {resume && (
              <p className="text-muted-foreground text-xs">
                A retomada usa os documentos preservados na solicitação.
              </p>
            )}
            <FieldGroup className="gap-3">
              {process ? null : cnj || context || resume ? (
                <div>
                  <p className="text-muted-foreground text-xs">
                    Processo (CNJ)
                  </p>
                  <p className="mt-1 text-sm">{courtNumber}</p>
                </div>
              ) : (
                <Field>
                  <FieldLabel htmlFor="filing-cnj">Processo (CNJ)</FieldLabel>
                  <Input
                    id="filing-cnj"
                    value={courtNumber}
                    disabled={busy}
                    placeholder="0000000-00.0000.0.00.0000"
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </Field>
              )}
              {context && !context.mfa_required && (
                <>
                  <ChoiceField
                    compact
                    id="filing-process"
                    label="Processo no tribunal"
                    value={process}
                    choices={context.processes}
                    disabled={busy}
                    onChange={(v) => {
                      setProcess(v);
                      setClassCode("");
                      setParty("");
                      setPartyType("");
                      setPrincipalType("");
                      setFee("");
                      setFiles((fs) => fs.map((f) => ({ ...f, type: "" })));
                      connect.mutate({ process_code: v, class_code: 0 });
                    }}
                  />
                  {process && (
                    <>
                      {(!classCode || editingClass) && (
                        <Field>
                          <FieldLabel htmlFor="filing-class-search">
                            Buscar tipo de petição
                          </FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              id="filing-class-search"
                              value={filter}
                              disabled={busy}
                              onChange={(e) => setFilter(e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => {
                                setEditingClass(false);
                                setClassCode("");
                                setPartyType("");
                                setPrincipalType("");
                                connect.mutate({ class_code: 0 });
                              }}
                            >
                              Buscar
                            </Button>
                          </div>
                        </Field>
                      )}
                      <ChoiceField
                        compact
                        id="filing-class"
                        label="Tipo de petição"
                        value={classCode}
                        choices={context.classes}
                        disabled={busy}
                        onEdit={() => setEditingClass(true)}
                        onChange={(v) => {
                          setClassCode(v);
                          setSelectedFilter(filter);
                          setEditingClass(false);
                          setPartyType("");
                          setPrincipalType("");
                          setFee("");
                          setFiles((fs) => fs.map((f) => ({ ...f, type: "" })));
                          connect.mutate({ class_code: Number(v) });
                        }}
                      />
                      <ChoiceField
                        compact
                        id="filing-party"
                        label="Parte representada"
                        value={party}
                        choices={context.parties}
                        disabled={busy}
                        onChange={setParty}
                      />
                      <ChoiceField
                        compact
                        id="filing-party-type"
                        label="Papel na petição"
                        value={partyType}
                        choices={context.party_types}
                        disabled={busy}
                        onChange={setPartyType}
                      />
                      <ChoiceField
                        compact
                        id="filing-fees"
                        label="Custas — conferir"
                        value={fee}
                        choices={[
                          {
                            id: "dispensa",
                            label: "Não há recolhimento / dispensa legal",
                          },
                          { id: "pendente", label: "Pendente de conferência" },
                        ]}
                        disabled={busy}
                        onChange={setFee}
                      />
                    </>
                  )}
                </>
              )}
            </FieldGroup>
            {context?.mfa_required && (
              <Field>
                <FieldLabel htmlFor="filing-mfa">
                  Código recebido por e-mail
                </FieldLabel>
                <Input
                  id="filing-mfa"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfa}
                  disabled={busy}
                  onChange={(e) => setMfa(e.target.value.replace(/\D/g, ""))}
                />
                <Button
                  disabled={busy || mfa.length !== 6}
                  onClick={() => connect.mutate({ mfa_code: mfa })}
                >
                  Validar código
                </Button>
              </Field>
            )}
            {documentChoices.length > 0 && (
              <ChoiceField
                compact
                id="filing-main-type"
                label="Peça principal · PDF"
                value={principalType}
                choices={documentChoices}
                disabled={locked || resume}
                onChange={setPrincipalType}
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <span>
                {resume
                  ? `${result?.documents.length ?? 0} documentos preservados`
                  : `Peça + ${files.length} anexos`}
              </span>
              <Button
                variant="link"
                size="sm"
                disabled={busy}
                onClick={openAttachments}
              >
                Conferir anexos
              </Button>
            </div>
            {!context && courtNumber && certificate && !busy && (
              <Button
                variant="outline"
                onClick={() => connect.mutate({ session_id: "" })}
              >
                Validar conexão
              </Button>
            )}
            <Button
              disabled={busy || !ready || status.isPending || status.isError}
              onClick={() => prepare.mutate()}
            >
              {prepare.isPending ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Send data-icon="inline-start" />
              )}
              {prepare.isPending
                ? "Enviando solicitação…"
                : resume
                  ? "Solicitar retomada"
                  : "Solicitar simulação"}
            </Button>
            {busy && (
              <p role="status" className="text-muted-foreground text-xs">
                {prepare.isPending
                  ? "Salvando a solicitação e os documentos…"
                  : "Consultando o tribunal…"}
              </p>
            )}
          </>
        )}
        {showResult && (
          <>
            <div className="flex items-center gap-2">
              <StatusIcon className="text-primary size-4" />
              <p className="font-medium">{statusLabel}</p>
            </div>
            <p className="text-muted-foreground text-sm">{statusDescription}</p>
            {result.queued_at && (
              <p className="text-muted-foreground text-xs">
                Solicitado em{" "}
                {new Date(result.queued_at).toLocaleString("pt-BR")}
              </p>
            )}
            {result.portal_url && (
              <Button
                render={
                  <a
                    href={result.portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
              >
                <ExternalLink data-icon="inline-start" />
                Conferir no e-SAJ
              </Button>
            )}
            {result.can_resume && (
              <Button
                variant="outline"
                onClick={() => {
                  setResume(true);
                  prepare.reset();
                  setOpen(true);
                }}
              >
                Conferir e retomar
              </Button>
            )}

            <Button variant="outline" onClick={openAttachments}>
              Conferir anexos
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error instanceof Error && error.message !== "internal error"
              ? error.message
              : "Não foi possível consultar o e-SAJ. Tente reconectar."}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          A execução acontece em segundo plano e para antes da assinatura e do
          protocolo definitivo.
        </p>
      </PopoverContent>
    </Popover>
  );
  const attachments = (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-medium">Anexos do peticionamento</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Confira os arquivos e a classificação de cada anexo.
        </p>
      </div>
      {showResult ? (
        <>
          <ul className="flex flex-col gap-3">
            {result.documents
              .filter((d) => !d.principal)
              .map((d) => (
                <li key={d.id} className="min-w-0 border-b pb-3">
                  <p className="break-words">{d.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {d.principal ? "Peça principal" : "Anexo"} · {d.type_label}{" "}
                    · {(d.bytes / 1024).toFixed(1)} KB
                  </p>
                </li>
              ))}
          </ul>
        </>
      ) : (
        <>
          {resume ? (
            <ul className="flex flex-col gap-3">
              {result?.documents
                .filter((d) => !d.principal)
                .map((d) => (
                  <li key={d.id}>
                    <p className="break-words">{d.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {d.type_label}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <>
              {files.map((f, i) => (
                <div
                  key={`${i}-${f.file.name}`}
                  className="flex flex-col gap-2 border-b pb-3"
                >
                  <p className="break-words">
                    {i + 1}. {f.file.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground mr-auto text-xs">
                      {(f.file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (preview) URL.revokeObjectURL(preview.url);
                        setPreview({
                          url: URL.createObjectURL(f.file),
                          name: f.file.name,
                        });
                      }}
                    >
                      Visualizar
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={locked || i === 0}
                      aria-label={`Mover ${f.file.name} para cima`}
                      onClick={() =>
                        setFiles((fs) => {
                          const next = [...fs];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={locked}
                      aria-label={`Remover ${f.file.name}`}
                      onClick={() =>
                        setFiles((fs) => fs.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {documentChoices.length > 0 ? (
                    <ChoiceField
                      compact
                      id={`filing-attachment-${i}`}
                      label="Tipo do anexo"
                      value={f.type}
                      choices={documentChoices}
                      disabled={locked}
                      onChange={(v) =>
                        setFiles((fs) =>
                          fs.map((x, n) => (n === i ? { ...x, type: v } : x)),
                        )
                      }
                    />
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Selecione o certificado em Protocolar para carregar os
                      tipos.
                    </p>
                  )}
                </div>
              ))}
              <input
                ref={upload}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="sr-only"
                aria-label="Adicionar anexos ao peticionamento"
                disabled={locked}
                onChange={(e) => {
                  const incoming = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (
                    files.length + incoming.length > 10 ||
                    incoming.some(
                      (f) =>
                        f.size === 0 ||
                        f.size > (context?.max_pdf_bytes || 20 * 1024 * 1024) ||
                        !f.name.toLowerCase().endsWith(".pdf"),
                    )
                  ) {
                    setFileError(
                      "Inclua até 10 PDFs válidos dentro do limite do tribunal.",
                    );
                    return;
                  }
                  setFileError("");
                  setFiles((fs) => [
                    ...fs,
                    ...incoming.map((file) => ({ file, type: "" })),
                  ]);
                }}
              />
              <Button
                variant="outline"
                disabled={locked || files.length >= 10}
                onClick={() => upload.current?.click()}
              >
                <Paperclip data-icon="inline-start" />
                Adicionar anexos
              </Button>
              {fileError && <p role="alert">{fileError}</p>}
            </>
          )}
          {context?.max_pdf_bytes ? (
            <p className="text-muted-foreground text-xs">
              Limite por PDF: {(context.max_pdf_bytes / 1024 / 1024).toFixed(1)}{" "}
              MB.
            </p>
          ) : null}
          {busy && <p role="status">Consultando o tribunal…</p>}
        </>
      )}
      <Sheet
        open={!!preview}
        onOpenChange={(v) => {
          if (!v) {
            if (preview) URL.revokeObjectURL(preview.url);
            setPreview(null);
          }
        }}
      >
        <SheetContent
          title={preview?.name ?? "Visualizar anexo"}
          className="max-w-4xl"
        >
          {preview && <PdfPreview url={preview.url} />}
        </SheetContent>
      </Sheet>
    </div>
  );
  return children({ trigger, attachments, status: progress });
}
