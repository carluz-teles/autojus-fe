"use client";

import { Plus, ShieldCheck } from "lucide-react";

import { useCertWizard } from "../../hooks/use-cert-wizard";
import { CertWizard } from "./cert-wizard";

// Aba Certificados digitais — port de Atjus - Certificado.dc.html: cabeçalho com
// "Adicionar certificado" (abre o wizard A1/A3) + lista de certificados.
export function ConfigCert() {
  const w = useCertWizard();

  return (
    <>
      <div className="mb-1.5 flex items-start justify-between gap-4">
        <div className="font-display text-[20px] font-medium">
          Certificados digitais
        </div>
        <button
          onClick={w.abrir}
          className="bg-primary text-primary-foreground inline-flex flex-none items-center gap-[7px] rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium"
        >
          <Plus className="size-3.5" strokeWidth={2} />
          Adicionar certificado
        </button>
      </div>
      <p className="text-fg3 mb-[18px] text-[12.5px]">
        Certificados usados para assinar e protocolar peças no tribunal.
      </p>
      <div className="border-line bg-panel overflow-hidden rounded-xl border">
        {w.lista.map((c) => (
          <div
            key={c.label}
            className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <ShieldCheck
              className="text-primary size-[18px] flex-none"
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

      <CertWizard w={w} />
    </>
  );
}
