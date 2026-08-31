"use client";

import {
  ChevronDown,
  ChevronLeft,
  Lock,
  ShieldCheck,
  SquareCheck,
} from "lucide-react";

import { usePeca } from "../../hooks/use-peca";
import { PecaCanvas } from "./peca-canvas";
import { PecaRail } from "./peca-rail";

// Superfície de autoria da peça (port 697-1119). Barra contextual + rail (288px)
// + canvas do documento (vazio → gerando → pronta). Componente = JSX + binding.
export function PecaWorkspace({ id }: { id: string }) {
  const peca = usePeca(id);
  const m = peca.model;

  if (!m) {
    return (
      <div className="text-fg3 flex flex-1 items-center justify-center text-[13px]">
        Peça não encontrada.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col text-[13px]">
      {/* barra contextual */}
      <div className="border-line flex shrink-0 items-center gap-3 border-b px-5 py-[11px]">
        <button
          onClick={peca.voltar}
          className="navi text-fg2 hover:bg-hover -ml-[9px] inline-flex items-center gap-1.5 rounded-md px-[9px] py-[5px] text-[12px]"
        >
          <ChevronLeft className="size-[13px]" strokeWidth={2} />
          Intimação
        </button>
        <span className="text-[13px] font-medium">{m.titulo}</span>
        <span className="bg-hover text-fg2 rounded-full px-[9px] py-0.5 text-[11px] font-medium">
          {m.statusLabel}
        </span>
        <span className="text-fg3 font-mono text-[11px]">{m.cnjCurto}</span>

        <div className="ml-auto flex gap-2">
          <button
            onClick={peca.salvar}
            className="navi border-line bg-panel text-foreground hover:bg-hover rounded-[7px] border px-3 py-[7px] text-[12px]"
          >
            Salvar
          </button>
          <button
            onClick={peca.enviarRevisao}
            className="navi border-line bg-panel text-foreground hover:bg-hover rounded-[7px] border px-3 py-[7px] text-[12px]"
          >
            Enviar p/ revisão
          </button>
          <span className="relative inline-block">
            <button
              onClick={peca.toggleProto}
              className="bg-primary text-primary-foreground inline-flex items-center gap-[7px] rounded-[7px] px-[13px] py-[7px] text-[12px] font-medium"
            >
              <SquareCheck className="size-[13px]" strokeWidth={1.9} />
              Protocolar
              <ChevronDown className="size-[11px]" strokeWidth={2.2} />
            </button>
            {peca.protoAberto ? (
              <>
                <div
                  onClick={peca.fecharProto}
                  className="fixed inset-0 z-20"
                />
                <div className="border-line bg-panel absolute top-full right-0 z-[21] mt-1.5 w-[300px] overflow-hidden rounded-[11px] border shadow-[0_16px_40px_oklch(0.27_0.012_200/18%)]">
                  <div className="border-line2 border-b p-[11px_14px_9px]">
                    <div className="text-[12px] font-semibold">
                      Assinar e protocolar com
                    </div>
                    <div className="text-fg3 mt-px text-[11px]">
                      Escolha o certificado digital
                    </div>
                  </div>
                  {peca.certs.map((c) => (
                    <button
                      key={c.label}
                      onClick={c.onSelect}
                      className="border-line2 hover:bg-hover grid w-full grid-cols-[30px_1fr_auto] items-center gap-2.5 border-b p-[10px_14px] text-left"
                    >
                      <ShieldCheck
                        className="text-primary size-[17px]"
                        strokeWidth={1.7}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">
                          {c.label}
                        </span>
                        <span className="text-fg3 mt-px block text-[10.5px]">
                          {c.meta}
                        </span>
                      </span>
                      <span className="bg-hover text-fg2 rounded-full px-[7px] py-0.5 text-[9.5px] font-semibold">
                        {c.tipo}
                      </span>
                    </button>
                  ))}
                  <div className="text-fg3 flex items-center gap-1.5 p-[9px_14px] text-[10.5px]">
                    <Lock className="size-3" strokeWidth={1.8} />
                    Assinatura ICP-Brasil · registra data e hora no protocolo
                  </div>
                </div>
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PecaRail peca={peca} />
        <PecaCanvas peca={peca} />
      </div>
    </div>
  );
}
