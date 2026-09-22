"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FileText, UploadCloud, X } from "lucide-react";
import { useRef } from "react";
import { Controller } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { CERT_ACCEPT } from "@/features/configuracoes/hooks/use-cert-upload";

import type { useCertWizard } from "../../hooks/use-cert-wizard";

// Modal "Adicionar certificado" — direto no A1 (BE real): arquivo .pfx/.p12 +
// senha → upload. Sem escolha de tipo, sem preview; erro do BE mostrado inline.
// Componente = JSX + binding; o input de arquivo é plumbing de UI. A senha é
// campo de formulário RHF (mensagem por campo via Field/FieldError).
export function CertWizard({ w }: { w: ReturnType<typeof useCertWizard> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    control,
    formState: { errors },
  } = w.form;

  if (!w.aberto) return null;

  return (
    <Dialog.Root
      open={w.aberto}
      onOpenChange={(open) => {
        if (!open && !w.adicionando) w.fechar();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Popup className="surface-panel fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl">
          <form onSubmit={w.adicionar} noValidate>
            <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
              <div>
                <Dialog.Title className="text-[16px] font-medium">
                  Adicionar certificado
                </Dialog.Title>
                <Dialog.Description className="text-fg3 mt-[3px] text-[12px]">
                  Envie o arquivo .pfx ou .p12 e informe a senha.
                </Dialog.Description>
              </div>
              <IconAction
                label="Fechar certificado"
                icon={X}
                type="button"
                onClick={w.fechar}
                disabled={w.adicionando}
                className="pointer-coarse:size-11"
              />
            </div>

            <div className="px-[22px] py-5">
              <input
                ref={inputRef}
                type="file"
                accept={CERT_ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) w.selecionarArquivo(f);
                  e.target.value = "";
                }}
              />
              {!w.file ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="border-line bg-bg text-fg2 row-hover flex w-full flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed p-[30px_22px]"
                >
                  <UploadCloud
                    className="text-primary size-[26px]"
                    strokeWidth={1.6}
                  />
                  <span className="text-foreground text-[13px] font-medium">
                    Clique para selecionar o arquivo
                  </span>
                  <span className="text-[11.5px]">.pfx ou .p12 · até 5 MB</span>
                </button>
              ) : (
                <>
                  <div className="border-line bg-bg mb-4 flex items-center gap-[11px] rounded-[10px] border px-3.5 py-3">
                    <span
                      className="grid size-[34px] flex-none place-items-center rounded-lg"
                      style={{
                        background:
                          "color-mix(in oklch, var(--primary) 11%, transparent)",
                      }}
                    >
                      <FileText
                        className="text-primary size-[17px]"
                        strokeWidth={1.7}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {w.file.nome}
                      </span>
                      <span className="text-fg3 block text-[11.5px]">
                        {w.file.tam}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={w.trocar}
                      className="border-line bg-panel text-fg2 hover:bg-hover flex min-h-9 flex-none items-center rounded-[7px] border px-2.5 py-[5px] text-[11.5px] pointer-coarse:min-h-11"
                    >
                      Trocar
                    </button>
                  </div>
                  <Field data-invalid={!!errors.senha}>
                    <FieldLabel htmlFor="certificate-password">
                      Senha do certificado
                    </FieldLabel>
                    <Controller
                      name="senha"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="certificate-password"
                          type="password"
                          autoComplete="off"
                          autoFocus
                          placeholder="••••••••"
                          aria-invalid={!!errors.senha}
                          {...field}
                        />
                      )}
                    />
                    <FieldError errors={[errors.senha]} />
                    <p className="text-fg3 mx-0.5 mt-[9px] text-[11px] leading-[1.5]">
                      A senha vai só para o servidor abrir o certificado e é
                      descartada — nunca é armazenada.
                    </p>
                  </Field>
                </>
              )}

              {w.erro ? (
                <p
                  className="text-destructive mt-3 text-[12px] leading-[1.45]"
                  role="alert"
                >
                  {w.erro}
                </p>
              ) : null}
            </div>

            <div className="border-line2 flex justify-end gap-2 border-t px-[22px] py-3.5">
              <button
                type="button"
                onClick={w.fechar}
                disabled={w.adicionando}
                className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!w.podeAdicionar}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
              >
                {w.adicionando ? "Adicionando…" : "Adicionar certificado"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
