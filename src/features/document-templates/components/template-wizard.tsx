"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowRight, Eye, FilePlus2, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { useDocumentTemplates } from "../hooks/use-document-templates";
import { TemplatePreviewDialog } from "./template-preview-dialog";

export function TemplateWizard({
  vm,
}: {
  vm: ReturnType<typeof useDocumentTemplates>;
}) {
  const w = vm.wizard;
  return (
    <Dialog.Root open={w.isOpen} onOpenChange={w.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35" />
        <Dialog.Popup className="surface-panel border-line fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[640px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl">
          <div className="border-line flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div>
              <p className="text-primary mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
                Novo modelo · Passo {w.step} de 2
              </p>
              <Dialog.Title className="font-display text-[22px] leading-tight font-medium">
                Adicionar modelo
              </Dialog.Title>
              <Dialog.Description className="text-fg3 mt-1 text-[12px]">
                {w.step === 1 ? "Enviar e validar" : "Modelo cadastrado"}
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={w.closeWizard}
              aria-label="Fechar diálogo"
            >
              <X aria-hidden />
            </Button>
          </div>

          {w.step === 1 ? (
            <form
              onSubmit={w.submit}
              noValidate
              className="flex min-h-0 flex-col overflow-hidden"
            >
              <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                <FieldGroup className="gap-5">
                  <Field data-invalid={!!w.form.formState.errors.name}>
                    <FieldLabel htmlFor="real-template-name">
                      Nome do modelo
                    </FieldLabel>
                    <Input
                      id="real-template-name"
                      placeholder="Ex.: Petição inicial do escritório"
                      autoComplete="off"
                      maxLength={200}
                      disabled={w.isPending || !!w.createdTemplateId}
                      aria-invalid={!!w.form.formState.errors.name}
                      aria-describedby="real-template-name-help"
                      {...w.form.register("name")}
                    />
                    <FieldDescription id="real-template-name-help">
                      {w.createdTemplateId
                        ? "O modelo já foi criado. Você pode substituir o arquivo antes de concluir."
                        : "Use um nome claro, com até 200 caracteres."}
                    </FieldDescription>
                    <FieldError errors={[w.form.formState.errors.name]} />
                  </Field>

                  <Field data-invalid={!!w.fileIssue}>
                    <FieldLabel htmlFor="real-template-file">
                      Arquivo DOCX
                    </FieldLabel>
                    <input
                      id="real-template-file"
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={w.chooseFile}
                      disabled={w.isPending}
                      aria-invalid={!!w.fileIssue}
                      aria-describedby="real-template-file-help real-template-file-error"
                      className="peer sr-only"
                    />
                    <label
                      htmlFor="real-template-file"
                      className="border-line bg-bg hover:bg-hover peer-focus-visible:outline-primary flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    >
                      <FilePlus2
                        aria-hidden
                        className="text-primary size-6"
                        strokeWidth={1.5}
                      />
                      <span className="text-[13px] font-medium break-all">
                        {w.file ? w.file.name : "Escolher arquivo .docx"}
                      </span>
                      <span className="text-fg3 text-[11px]">Até 10 MiB</span>
                    </label>
                    <FieldDescription id="real-template-file-help">
                      O arquivo será enviado e validado antes de aparecer como
                      pronto.
                    </FieldDescription>
                    <FieldError id="real-template-file-error">
                      {w.fileIssue}
                    </FieldError>
                  </Field>
                </FieldGroup>

                <div className="border-line bg-selected mt-5 rounded-xl border px-4 py-4">
                  <p className="text-[12px] font-semibold">
                    Como preparar o documento
                  </p>
                  <p className="text-fg2 mt-1 text-[12px] leading-relaxed">
                    Coloque{" "}
                    <code className="bg-panel rounded px-1 py-0.5 font-mono text-[11px]">
                      {"{{CONTEUDO_PECA}}"}
                    </code>{" "}
                    uma única vez, em um parágrafo próprio no corpo do DOCX. O
                    cabeçalho e o rodapé permanecem no documento gerado.
                  </p>
                  <a
                    href="/document-templates/fictional-office.docx"
                    download
                    className="text-primary mt-3 inline-block text-[12px] font-medium underline underline-offset-2"
                  >
                    Baixar DOCX fictício de exemplo
                  </a>
                </div>
                {w.createdTemplateId ? (
                  <p className="text-fg3 mt-4 text-[11px] leading-relaxed">
                    Este modelo já foi criado. Fechar esta janela não desfaz o
                    cadastro.
                  </p>
                ) : null}
                {w.phase && w.isPending ? (
                  <p role="status" className="text-primary mt-4 text-[12px]">
                    {w.phase}
                  </p>
                ) : null}
                {w.issue ? (
                  <p
                    role="alert"
                    className="text-destructive mt-4 text-[12px] leading-relaxed"
                  >
                    {w.issue}
                  </p>
                ) : null}
                {w.createUncertain ? (
                  <p className="text-fg3 mt-2 text-[11px] leading-relaxed">
                    Não sabemos se o cadastro foi concluído. Feche e confira a
                    lista antes de iniciar outro modelo.
                  </p>
                ) : null}
              </div>
              <div className="border-line bg-panel flex shrink-0 flex-wrap justify-end gap-2 border-t px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" onClick={w.closeWizard}>
                  Fechar
                </Button>
                <Button
                  type="submit"
                  disabled={w.isPending || w.createUncertain}
                >
                  {w.isPending
                    ? "Enviando e validando…"
                    : w.createdTemplateId
                      ? "Tentar novamente"
                      : "Enviar e validar"}
                  {!w.isPending ? (
                    <ArrowRight data-icon="inline-end" aria-hidden />
                  ) : null}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex min-h-0 flex-col overflow-hidden">
              <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="border-line bg-bg flex min-w-0 items-start gap-3 rounded-xl border p-4">
                  <FileText
                    aria-hidden
                    className="text-primary size-5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold break-words">
                      {w.form.getValues("name")}
                    </p>
                    <p className="text-fg3 mt-1 text-[11px] break-all">
                      {w.file?.name} · Versão {w.result?.version_no}
                    </p>
                  </div>
                </div>
                <div className="border-line bg-selected mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold">
                      Modelo cadastrado e validado
                    </h3>
                    <p className="text-fg3 mt-1 text-[12px] leading-relaxed">
                      Confira o PDF gerado a partir do DOCX enviado. Você pode
                      definir este modelo como padrão na lista.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={vm.openWizardPreview}
                  >
                    <Eye data-icon="inline-start" aria-hidden /> Visualizar
                    exemplo
                  </Button>
                </div>
              </div>
              <div className="border-line bg-panel flex shrink-0 justify-end border-t px-5 py-4 sm:px-6">
                <Button type="button" onClick={w.closeWizard}>
                  Concluir
                </Button>
              </div>
            </div>
          )}
          <TemplatePreviewDialog
            preview={vm.preview}
            open={vm.preview.isWizardOpen}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
