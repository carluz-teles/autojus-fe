import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { useApi, usePresignedStorage } from "@/lib/api/use-api";

import {
  confirmDocumentTemplateVersion,
  createDocumentTemplate,
  type DocumentTemplateVersion,
  getDocumentTemplate,
  putDocumentTemplateBytes,
  startDocumentTemplateUpload,
} from "../../services/document-templates.service";

const MAX_SIZE = 10 * 1024 * 1024;
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do modelo.")
    .max(200, "Use até 200 caracteres."),
});
const fileSchema = z
  .custom<File>((value) => value instanceof File, "Selecione um arquivo .docx.")
  .refine((file) => /\.docx$/i.test(file.name), "Selecione um arquivo .docx.")
  .refine((file) => file.size > 0, "O arquivo está vazio.")
  .refine(
    (file) => file.size <= MAX_SIZE,
    "O arquivo deve ter no máximo 10 MiB.",
  );

type FormValues = z.infer<typeof formSchema>;
type Attempt = {
  templateId?: string;
  versionId?: string;
  uploadUrl?: string;
  uploaded: boolean;
  confirmStarted: boolean;
  createUncertain: boolean;
};

function initialAttempt(): Attempt {
  return { uploaded: false, confirmStarted: false, createUncertain: false };
}

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir o envio.";
}

export function useTemplateWizard(
  orgId: string | null | undefined,
  refresh: () => Promise<unknown>,
) {
  const fetcher = useApi();
  const storage = usePresignedStorage();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });
  const [openOrg, setOpenOrg] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileIssue, setFileIssue] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(
    null,
  );
  const [createUncertain, setCreateUncertain] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const attempt = useRef<Attempt>(initialAttempt());
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const isOpen = !!orgId && openOrg === orgId;

  const upload = useMutation({
    mutationFn: async ({
      name,
      file: selected,
      run,
    }: {
      name: string;
      file: File;
      run: number;
    }) => {
      if (run !== sequence.current)
        throw new DOMException("Cancelado", "AbortError");
      const abort = new AbortController();
      controller.current = abort;
      const current = attempt.current;
      const finish = (version: DocumentTemplateVersion) => {
        if (run !== sequence.current || abort.signal.aborted)
          throw new DOMException("Cancelado", "AbortError");
        return version;
      };
      if (current.createUncertain)
        throw new Error("Confira a lista antes de iniciar outro cadastro.");

      if (!current.templateId) {
        setPhase("Criando modelo…");
        try {
          const template = await createDocumentTemplate(
            fetcher,
            name,
            abort.signal,
          );
          if (run !== sequence.current || abort.signal.aborted)
            throw new DOMException("Cancelado", "AbortError");
          current.templateId = template.id;
          setCreatedTemplateId(template.id);
        } catch (error) {
          if (run !== sequence.current || abort.signal.aborted)
            throw new DOMException("Cancelado", "AbortError");
          if (!(error instanceof ApiError) || error.status !== 400)
            current.createUncertain = true;
          if (current.createUncertain) setCreateUncertain(true);
          throw error;
        }
      }
      if (run !== sequence.current)
        throw new DOMException("Cancelado", "AbortError");

      if (!current.versionId || !current.uploadUrl) {
        setPhase("Preparando upload…");
        const started = await startDocumentTemplateUpload(
          fetcher,
          current.templateId,
          abort.signal,
        );
        if (run !== sequence.current || abort.signal.aborted)
          throw new DOMException("Cancelado", "AbortError");
        current.versionId = started.version.id;
        current.uploadUrl = started.url;
        current.uploaded = false;
        current.confirmStarted = false;
      }
      if (run !== sequence.current)
        throw new DOMException("Cancelado", "AbortError");

      if (!current.uploaded) {
        setPhase("Enviando arquivo…");
        try {
          await putDocumentTemplateBytes(
            storage,
            current.uploadUrl,
            selected,
            abort.signal,
          );
          if (run !== sequence.current || abort.signal.aborted)
            throw new DOMException("Cancelado", "AbortError");
          current.uploaded = true;
        } catch (error) {
          if (run !== sequence.current || abort.signal.aborted)
            throw new DOMException("Cancelado", "AbortError");
          if (error instanceof ApiError && [400, 403].includes(error.status)) {
            current.versionId = undefined;
            current.uploadUrl = undefined;
            throw new Error(
              "A URL de upload expirou. Tente novamente para gerar outra versão.",
            );
          }
          throw error;
        }
      }
      if (run !== sequence.current)
        throw new DOMException("Cancelado", "AbortError");

      if (current.confirmStarted) {
        setPhase("Conferindo validação…");
        const detail = await getDocumentTemplate(
          fetcher,
          current.templateId,
          abort.signal,
        );
        if (run !== sequence.current || abort.signal.aborted)
          throw new DOMException("Cancelado", "AbortError");
        const existing = detail.versions.find(
          (version) => version.id === current.versionId,
        );
        if (existing?.status === "READY") return finish(existing);
        if (existing?.status === "VALIDATING")
          throw new Error(
            "A validação ainda está em andamento. Tente novamente em instantes.",
          );
      }

      setPhase("Validando documento…");
      current.confirmStarted = true;
      try {
        const version = await confirmDocumentTemplateVersion(
          fetcher,
          current.templateId,
          current.versionId,
          abort.signal,
        );
        if (version.status !== "READY")
          throw new Error(
            version.diagnostic || "O documento ainda não está pronto.",
          );
        return finish(version);
      } catch (error) {
        if (run !== sequence.current || abort.signal.aborted)
          throw new DOMException("Cancelado", "AbortError");
        try {
          const detail = await getDocumentTemplate(
            fetcher,
            current.templateId,
            abort.signal,
          );
          if (run !== sequence.current || abort.signal.aborted)
            throw new DOMException("Cancelado", "AbortError");
          const existing = detail.versions.find(
            (version) => version.id === current.versionId,
          );
          if (existing?.status === "READY") return finish(existing);
          if (existing?.diagnostic) throw new Error(existing.diagnostic);
        } catch (inspectionError) {
          if (
            inspectionError instanceof Error &&
            !(inspectionError instanceof ApiError)
          )
            throw inspectionError;
        }
        throw error;
      }
    },
    onSuccess: async (version: DocumentTemplateVersion, { run }) => {
      if (
        run === sequence.current &&
        controller.current &&
        !controller.current.signal.aborted &&
        version.status === "READY"
      ) {
        setStep(2);
        setIssue(null);
        setAnnouncement("Modelo cadastrado e validado.");
        await refresh();
      }
    },
  });
  const resetForm = form.reset;
  const resetUpload = upload.reset;

  function openWizard() {
    if (!orgId) return;
    sequence.current += 1;
    attempt.current = initialAttempt();
    setCreatedTemplateId(null);
    setCreateUncertain(false);
    setFile(null);
    setFileIssue(null);
    setIssue(null);
    setPhase("");
    setAnnouncement("");
    setStep(1);
    form.reset({ name: "" });
    upload.reset();
    setOpenOrg(orgId);
  }

  function closeWizard() {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    setOpenOrg(null);
    setStep(1);
    if (attempt.current.templateId) void refresh();
  }

  function onOpenChange(next: boolean) {
    if (!next) closeWizard();
  }

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    const checked = fileSchema.safeParse(selected);
    setFile(checked.success ? selected : null);
    setFileIssue(
      checked.success
        ? null
        : (checked.error.issues[0]?.message ?? "Arquivo inválido."),
    );
    setIssue(null);
    if (checked.success && attempt.current.templateId) {
      attempt.current.versionId = undefined;
      attempt.current.uploadUrl = undefined;
      attempt.current.uploaded = false;
      attempt.current.confirmStarted = false;
    }
  }

  async function submitValid({ name }: FormValues) {
    if (!file) {
      setFileIssue("Selecione um arquivo .docx.");
      return;
    }
    setIssue(null);
    const run = ++sequence.current;
    try {
      await upload.mutateAsync({ name, file, run });
    } catch (error) {
      if (run !== sequence.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setIssue(messageFrom(error));
      if (attempt.current.createUncertain) void refresh();
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    void form.handleSubmit(submitValid)(event);
  }

  useEffect(
    () => () => {
      sequence.current += 1;
      controller.current?.abort();
      controller.current = null;
      attempt.current = initialAttempt();
      setOpenOrg(null);
      setStep(1);
      setFile(null);
      setFileIssue(null);
      setIssue(null);
      setPhase("");
      setCreatedTemplateId(null);
      setCreateUncertain(false);
      setAnnouncement("");
      resetForm({ name: "" });
      resetUpload();
    },
    [orgId, resetForm, resetUpload],
  );

  return {
    form,
    file,
    fileIssue,
    issue,
    phase,
    step,
    isOpen,
    createdTemplateId,
    announcement,
    result: upload.data,
    isPending: upload.isPending,
    createUncertain,
    openWizard,
    closeWizard,
    onOpenChange,
    chooseFile,
    submit,
  };
}
