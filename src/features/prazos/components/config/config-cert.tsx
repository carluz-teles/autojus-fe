"use client";

import { ShieldCheck, UploadCloud } from "lucide-react";

import type { useConfig } from "../../hooks/use-config";

// Aba Certificados digitais — port do template 1455-1472: dropzone de upload
// A1 (.pfx/.p12) + lista de certificados (label, tipo·validade, status badge).
export function ConfigCert({ cfg }: { cfg: ReturnType<typeof useConfig> }) {
  return (
    <>
      <div className="font-display mb-1 text-[20px] font-medium">
        Certificados digitais
      </div>
      <p className="text-fg3 mt-0 mb-4 text-[12.5px]">
        Certificados usados para assinar e protocolar peças.
      </p>
      <button
        onClick={cfg.enviarCert}
        className="border-line bg-panel text-fg2 hover:bg-hover mb-4 flex w-full flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed p-[22px]"
      >
        <UploadCloud className="text-primary size-6" strokeWidth={1.7} />
        <span className="text-foreground text-[13px] font-medium">
          Enviar certificado A1 (.pfx / .p12)
        </span>
        <span className="text-[11.5px]">
          ou conecte um token A3 no dispositivo
        </span>
      </button>
      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {cfg.certificados.map((c) => (
          <div
            key={c.label}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <ShieldCheck
              className="text-primary size-[17px] flex-none"
              strokeWidth={1.7}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{c.label}</span>
              <span className="text-fg3 block text-[11.5px]">
                {c.tipo} · {c.validade}
              </span>
            </span>
            <span
              className="flex-none rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={{ background: c.statusFundo, color: c.statusCor }}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
