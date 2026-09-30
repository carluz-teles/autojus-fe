"use client";

import { Eye, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SettingsSection,
  StatusPill,
} from "@/features/prazos/components/config/config-kit";

import { useDocumentTemplates } from "../hooks/use-document-templates";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { TemplateWizard } from "./template-wizard";

export function ConfigDocumentTemplates() {
  const vm = useDocumentTemplates();
  return (
    <SettingsSection
      title="Modelos de documentos"
      subtitle="Cadastre o DOCX do escritório, confira o PDF gerado e escolha o modelo padrão."
      action={
        <Button
          onClick={vm.wizard.openWizard}
          disabled={!vm.data.orgId}
          className="pointer-coarse:min-h-11"
        >
          <Plus data-icon="inline-start" aria-hidden /> Adicionar modelo
        </Button>
      }
    >
      <section
        aria-labelledby="document-template-list-title"
        className="min-w-0"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3
            id="document-template-list-title"
            className="text-fg2 text-[11px] font-semibold tracking-[0.1em] uppercase"
          >
            Modelos cadastrados
          </h3>
          <span className="text-fg3 text-[11px] tabular-nums">
            {vm.data.rows.length} modelos
          </span>
        </div>

        {!vm.data.orgId ? (
          <p className="border-line bg-panel text-fg3 rounded-xl border px-5 py-7 text-[13px]">
            Selecione um escritório para ver seus modelos.
          </p>
        ) : vm.data.list.isPending || vm.data.selectedDefault.isPending ? (
          <p
            role="status"
            className="text-fg3 border-line bg-panel rounded-xl border px-5 py-7 text-[13px]"
          >
            Carregando modelos…
          </p>
        ) : vm.data.list.isError || vm.data.selectedDefault.isError ? (
          <div className="border-line bg-panel rounded-xl border px-5 py-7">
            <p role="alert" className="text-destructive text-[13px]">
              Não foi possível carregar os modelos do escritório.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={vm.data.retry}
              className="mt-3"
            >
              Tentar novamente
            </Button>
          </div>
        ) : vm.data.rows.length === 0 ? (
          <div className="border-line bg-panel rounded-xl border px-5 py-9 text-center">
            <FileText aria-hidden className="text-primary mx-auto size-7" />
            <p className="mt-3 text-[13px] font-medium">
              Nenhum modelo cadastrado
            </p>
            <p className="text-fg3 mt-1 text-[12px]">
              Adicione um DOCX para preparar o primeiro modelo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {vm.data.rows.map((row) => (
              <div
                key={row.id}
                className="surface-panel border-line flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="bg-selected text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                    <FileText
                      aria-hidden
                      className="size-[19px]"
                      strokeWidth={1.6}
                    />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-[13px] leading-snug font-semibold break-words">
                      {row.name}
                    </h4>
                    <p className="text-fg3 mt-1 text-[11px]">
                      Documento Word (.docx)
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {row.latest_version ? (
                        <span className="text-fg3 text-[11px]">
                          Versão {row.latest_version.version_no}
                        </span>
                      ) : null}
                      <StatusPill
                        label={row.statusLabel}
                        tone={row.statusTone}
                      />
                      {row.isDefault ? (
                        <StatusPill
                          label={
                            row.defaultIsLatest
                              ? "Padrão"
                              : "Padrão em versão anterior"
                          }
                          tone="info"
                        />
                      ) : null}
                    </div>
                    {row.latest_version?.status === "FAILED" &&
                    row.latest_version.diagnostic ? (
                      <p className="text-destructive mt-2 max-w-[560px] text-[11px] leading-relaxed break-words">
                        {row.latest_version.diagnostic}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 pl-[52px] sm:justify-end sm:pl-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-template-id={row.id}
                    data-template-name={row.name}
                    onClick={vm.preview.open}
                    disabled={!row.latest_version && !row.isDefault}
                  >
                    <Eye data-icon="inline-start" aria-hidden /> Visualizar
                    modelo
                  </Button>
                  {row.canSetDefault ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      data-version-id={row.latest_version?.id}
                      onClick={vm.data.selectDefault}
                      disabled={vm.data.chooseDefault.isPending}
                    >
                      Definir como padrão
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {vm.data.chooseDefault.isError ? (
          <p role="alert" className="text-destructive mt-3 text-[12px]">
            {vm.data.chooseDefault.error.message}
          </p>
        ) : null}
        {vm.data.list.isFetchNextPageError ? (
          <p role="alert" className="text-destructive mt-3 text-[12px]">
            Não foi possível carregar mais modelos. Tente novamente.
          </p>
        ) : null}
        {vm.data.list.hasNextPage ? (
          <div className="mt-5 flex justify-center">
            <Button
              variant="outline"
              onClick={vm.data.loadMore}
              disabled={vm.data.list.isFetchingNextPage}
            >
              {vm.data.list.isFetchingNextPage
                ? "Carregando…"
                : "Carregar mais"}
            </Button>
          </div>
        ) : null}
      </section>

      <TemplatePreviewDialog
        preview={vm.preview}
        open={vm.preview.isListOpen}
      />
      <TemplateWizard vm={vm} />
    </SettingsSection>
  );
}
