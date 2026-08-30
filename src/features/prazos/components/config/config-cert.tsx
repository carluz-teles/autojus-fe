"use client";

import { Plus, ShieldCheck } from "lucide-react";

import { useCertWizard } from "../../hooks/use-cert-wizard";
import { CertWizard } from "./cert-wizard";

// Aba Certificados digitais (A1 real, BE): cabeçalho + "Adicionar certificado"
// (wizard) + lista de certificados cadastrados com remoção.
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

      {w.listaErro ? (
        <p className="text-destructive text-[12.5px]">
          Não foi possível carregar os certificados.
        </p>
      ) : (
        <div className="border-line bg-panel overflow-hidden rounded-xl border">
          {w.listaPendente ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="border-line2 flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
              >
                <span className="bg-hover size-[18px] flex-none animate-pulse rounded" />
                <span className="min-w-0 flex-1">
                  <span className="bg-hover mb-1.5 block h-3 w-32 animate-pulse rounded" />
                  <span className="bg-hover block h-2.5 w-44 animate-pulse rounded" />
                </span>
              </div>
            ))
          ) : w.lista.length === 0 ? (
            <div className="text-fg3 px-4 py-8 text-center text-[12.5px]">
              Nenhum certificado cadastrado. Adicione um A1 para assinar e
              protocolar.
            </div>
          ) : (
            w.lista.map((c) => (
              <div
                key={c.id}
                className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <ShieldCheck
                  className="text-primary size-[18px] flex-none"
                  strokeWidth={1.7}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    {c.label}
                  </span>
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
                <button
                  onClick={c.remover}
                  disabled={c.removendo}
                  className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50"
                >
                  {c.removendo ? "Removendo…" : "Remover"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <CertWizard w={w} />
    </>
  );
}
