"use client";

import { Check, Loader2, Sparkles } from "lucide-react";

import type { usePeca } from "../../hooks/use-peca";
import { PecaToolbar } from "./peca-toolbar";

type Peca = ReturnType<typeof usePeca>;
type Model = NonNullable<Peca["model"]>;
type DireitoBloco = Model["direito"][number];

// Chip da citação inline (verde=✓ confirmada, gold=? a verificar).
function CitaChip({ art, ok }: { art: string; ok: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] rounded-[5px] px-1.5 text-[12.5px] whitespace-nowrap"
      style={{
        background: ok
          ? "color-mix(in oklch, var(--green) 12%, transparent)"
          : "color-mix(in oklch, var(--gold) 14%, transparent)",
        color: ok ? "var(--green)" : "var(--gold)",
      }}
    >
      {art} {ok ? "✓" : "?"}
    </span>
  );
}

// Bloco de tese dentro de "II — Do direito", com aprovação/remoção inline.
function DireitoBlock({ d }: { d: DireitoBloco }) {
  return (
    <div
      className="mb-3.5 rounded-[10px] border p-[12px_14px]"
      style={{ background: d.fundo, borderColor: d.borda }}
    >
      {d.pendAdd ? (
        <div className="text-primary mb-[7px] flex items-center gap-1.5">
          <Sparkles className="size-[13px]" strokeWidth={1.9} />
          <span className="text-[10px] font-semibold tracking-[0.03em] uppercase">
            Inclusão proposta · {d.label}
          </span>
        </div>
      ) : null}
      {d.pendRemove ? (
        <div className="mb-[7px] flex items-center gap-1.5">
          <span className="text-red text-[10px] font-semibold tracking-[0.03em] uppercase">
            Remoção proposta · {d.label}
          </span>
        </div>
      ) : null}
      {d.on ? (
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-display text-[13px] font-semibold">
            {d.titulo}
          </span>
          <button
            onClick={d.remover}
            className="border-line bg-bg text-fg3 hover:bg-hover ml-auto rounded-md border px-2 py-0.5 text-[10.5px]"
          >
            Remover
          </button>
        </div>
      ) : null}
      <div
        className="font-display text-[14.5px] leading-[1.9]"
        style={{
          textAlign: "justify",
          color: d.textCor,
          textDecoration: d.strike,
        }}
      >
        {d.arg.pre}
        <CitaChip art={d.arg.art} ok={d.arg.ok} />
        {d.arg.pos}
      </div>
      {d.pendAdd ? (
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={d.aprovar}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12px] font-medium"
          >
            <Check className="size-[13px]" strokeWidth={2.2} />
            Aprovar
          </button>
          <button
            onClick={d.descartar}
            className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-1.5 text-[12px]"
          >
            Descartar
          </button>
        </div>
      ) : null}
      {d.pendRemove ? (
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={d.aprovar}
            className="bg-red rounded-[7px] px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Aprovar remoção
          </button>
          <button
            onClick={d.descartar}
            className="border-line bg-panel text-fg2 hover:bg-hover rounded-[7px] border px-3 py-1.5 text-[12px]"
          >
            Manter
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Canvas do documento (port 851-937): 3 estados vazio/gerando/pronta.
export function PecaCanvas({ peca }: { peca: Peca }) {
  const m = peca.model;
  if (!m) return null;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-[color-mix(in_oklch,var(--fg)_4%,var(--bg))]">
      {/* vazio */}
      {m.estVazio ? (
        <div className="mx-auto mt-[12vh] max-w-[520px] px-6 text-center">
          <div className="border-line bg-panel text-primary mx-auto mb-4 grid size-[52px] place-items-center rounded-[14px] border">
            <Sparkles className="size-6" strokeWidth={1.6} />
          </div>
          <h2 className="font-display mb-1.5 text-[22px] font-medium">
            Redigir {m.titulo} com IA
          </h2>
          <p className="text-fg2 mx-auto mb-[18px] max-w-[400px] text-[13px] leading-[1.6]">
            A IA parte da intimação de origem e das{" "}
            <strong className="text-foreground font-medium">
              {m.nTesesLabel}
            </strong>{" "}
            selecionadas ao lado. Você revisa e assina — a autoria é sua.
          </p>
          <button
            onClick={peca.gerar}
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-[9px] px-[18px] py-2.5 text-[13px] font-medium"
          >
            <Sparkles className="size-[15px]" strokeWidth={1.8} />
            Gerar minuta
          </button>
        </div>
      ) : null}

      {/* gerando */}
      {m.estGerando ? (
        <div className="border-line bg-panel mx-auto my-10 min-h-[400px] max-w-[720px] rounded-md border p-[56px_64px] shadow-[0_8px_30px_oklch(0.27_0.012_200/8%)]">
          <div className="text-primary mb-6 flex items-center gap-[9px] text-[12.5px]">
            <Loader2 className="size-[15px] animate-spin" strokeWidth={1.9} />
            Redigindo a partir da intimação e de {m.nTesesLabel}…
          </div>
          {m.skelLinhas.map((w, i) => (
            <div
              key={i}
              className="bg-muted mb-3.5 h-3 animate-pulse rounded"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      ) : null}

      {/* pronta: editor */}
      {m.estPronta ? (
        <>
          <PecaToolbar peca={peca} />
          <div className="border-line bg-panel mx-auto my-7 max-w-[720px] rounded-md border shadow-[0_8px_30px_oklch(0.27_0.012_200/8%)]">
            <div className="border-line2 text-primary flex items-center gap-2 border-b px-5 py-2.5 text-[11px]">
              <Sparkles className="size-[13px] shrink-0" strokeWidth={1.8} />
              Rascunho da IA — edite livremente, a autoria é sua
            </div>

            {/* corpo — topo (síntese dos fatos) */}
            <div className="font-display text-foreground p-[44px_56px_20px] text-[14.5px] leading-[1.9]">
              <p className="mb-6 text-center leading-[1.6] tracking-[0.02em] uppercase">
                {m.enderecamento}
              </p>
              <p className="text-fg2 mb-[22px] font-mono text-[12px]">
                Processo nº {m.cnj}
              </p>
              <p className="mb-[26px] text-justify">
                {m.cliente}, já qualificado(a) nos autos em epígrafe, por seu
                advogado que esta subscreve, vem, respeitosamente, à presença de
                Vossa Excelência apresentar <strong>{m.titulo}</strong>, pelas
                razões de fato e de direito a seguir expostas.
              </p>
              <h3 className="mb-2 font-semibold">I — Síntese dos fatos</h3>
              <p className="text-justify">
                Conforme a intimação publicada em {m.publicacao}, foi
                determinada a apresentação de {m.titulo.toLowerCase()}, o que
                ora se cumpre tempestivamente, no prazo legal.
              </p>
            </div>

            {/* II — Do direito: teses com aprovação inline */}
            <div className="px-14 pb-1">
              <h3 className="font-display mb-3 text-[14.5px] font-semibold">
                II — Do direito
              </h3>
              {m.direito.map((d) => (
                <DireitoBlock key={d.id} d={d} />
              ))}
              {m.direitoVazio ? (
                <p className="text-fg3 m-0 text-[13px] italic">
                  Nenhuma tese incluída — marque uma tese no painel à esquerda
                  para propô-la aqui.
                </p>
              ) : null}
            </div>

            {/* corpo — pedidos */}
            <div className="font-display text-foreground p-[16px_56px_44px] text-[14.5px] leading-[1.9]">
              <h3 className="mb-2 font-semibold">III — Dos pedidos</h3>
              <p className="mb-2 text-justify">Ante o exposto, requer-se:</p>
              <ol className="mb-6 list-decimal pl-[22px]">
                <li className="mb-1.5">
                  o acolhimento das preliminares suscitadas;
                </li>
                <li className="mb-1.5">
                  no mérito, a total improcedência dos pedidos;
                </li>
                <li>
                  a condenação da parte adversa ao pagamento de custas e
                  honorários.
                </li>
              </ol>
              <p className="mt-7 text-center">
                Termos em que,
                <br />
                pede deferimento.
              </p>
              <p className="text-fg3 mt-5 text-center">
                São Paulo, 29 de agosto de 2026.
                <br />
                ______________________________
                <br />
                {m.resp} — OAB/SP
              </p>
            </div>
          </div>
          <div className="h-10" />
        </>
      ) : null}
    </div>
  );
}
