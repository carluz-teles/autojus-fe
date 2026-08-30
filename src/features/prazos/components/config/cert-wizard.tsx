"use client";

import { FileText, UploadCloud, X } from "lucide-react";
import { useRef } from "react";

import { CERT_ACCEPT } from "@/features/configuracoes/hooks/use-cert-upload";

import type { useCertWizard } from "../../hooks/use-cert-wizard";

// Modal "Adicionar certificado" — direto no A1 (BE real): arquivo .pfx/.p12 +
// senha → upload. Sem escolha de tipo, sem preview; erro do BE mostrado inline.
// Componente = JSX + binding; o input de arquivo é plumbing de UI.
export function CertWizard({ w }: { w: ReturnType<typeof useCertWizard> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!w.aberto) return null;

  return (
    <div
      onClick={w.fechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[480px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              Adicionar certificado
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">
              Envie o arquivo .pfx ou .p12 e informe a senha.
            </p>
          </div>
          <button
            onClick={w.fechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
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
                  onClick={w.trocar}
                  className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px]"
                >
                  Trocar
                </button>
              </div>
              <label className="text-fg3 mb-1.5 block text-[11.5px]">
                Senha do certificado
              </label>
              <input
                autoFocus
                value={w.senha}
                onChange={(e) => w.setSenha(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
              />
              <p className="text-fg3 mx-0.5 mt-[9px] text-[11px] leading-[1.5]">
                A senha vai só para o servidor abrir o certificado e é
                descartada — nunca é armazenada.
              </p>
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
            onClick={w.fechar}
            className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={w.adicionar}
            disabled={!w.podeAdicionar}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
          >
            {w.adicionando ? "Adicionando…" : "Adicionar certificado"}
          </button>
        </div>
      </div>
    </div>
  );
}
