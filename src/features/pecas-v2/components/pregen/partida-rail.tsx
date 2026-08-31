"use client";

// Rail de contexto da PARTIDA (antes da peça existir). Diferente do ContextRail
// (que exige um Draft carregado), aqui o contexto vem do DETALHE DA INTIMAÇÃO
// (mesma fonte da tela de Intimação) — processo, teor, partes, prazo. "FUNDADA EM"
// é derivada das próprias teses (os documentos de origem que elas citam). O bloco
// "TESES A INCLUIR" entra via `tesesSlot`. Espelha o aside "Contexto" do design.

import { FileText, Mail } from "lucide-react";
import type { ReactNode } from "react";

import type { Thesis } from "../../types";

/** Subconjunto do model do detalhe da intimação que o rail consome. */
export interface PartidaContexto {
  cnj: string;
  classe: string;
  assunto: string;
  orgao: string;
  tribunalGrau: string;
  tipoLabel: string;
  publicadoEm: string;
  teor: string;
  prazoNum: string;
  prazoFrase: string;
  prazoCor: string;
  destinatarios: { nome: string; oab: string; matched: boolean }[];
}

interface Props {
  contexto: PartidaContexto | null;
  contextoLoading: boolean;
  theses: Thesis[];
  highlightedDocId: string | null;
  tesesSlot: ReactNode;
}

export function PartidaRail({
  contexto,
  contextoLoading,
  theses,
  highlightedDocId,
  tesesSlot,
}: Props) {
  const sources = dedupeSources(theses);

  return (
    <div className="border-line bg-panel w-72 flex-none overflow-y-auto border-r p-4">
      <SectionLabel>Contexto do processo</SectionLabel>
      {contextoLoading && !contexto ? (
        <RailSkeleton />
      ) : contexto ? (
        <>
          <div className="mt-1 flex items-start gap-2.5">
            <FileText className="text-fg3 mt-0.5 size-[15px] flex-none" />
            <div className="min-w-0 flex-1">
              <div className="text-fg2 font-mono text-[11.5px]">
                {contexto.cnj || "—"}
              </div>
              <div className="text-fg3 mt-px text-[11px]">
                {contexto.classe || "—"}
              </div>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px]">
            <Meta rot="Assunto" val={contexto.assunto} />
            <Meta rot="Órgão" val={contexto.orgao} />
            <Meta rot="Tribunal" val={contexto.tribunalGrau} />
          </dl>

          <div className="border-line2 mt-4 rounded-lg border border-dashed p-2.5">
            <div className="text-fg3 flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.05em] uppercase">
              <Mail className="size-3" />
              Intimação
            </div>
            <div className="text-fg2 mt-1 text-[12px]">
              {contexto.tipoLabel}
            </div>
            <div className="text-fg3 mt-px text-[11px]">
              publicada em {contexto.publicadoEm}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className="font-display text-[17px] tabular-nums"
                style={{ color: contexto.prazoCor }}
              >
                {contexto.prazoNum}
              </span>
              <span className="text-fg3 text-[11px]">
                {contexto.prazoFrase}
              </span>
            </div>
            {contexto.teor && (
              <p className="border-line text-fg3 mt-2 max-h-28 overflow-y-auto border-l-2 pl-2 text-[11px] leading-[1.5]">
                {contexto.teor}
              </p>
            )}
          </div>

          {contexto.destinatarios.length > 0 && (
            <>
              <SectionLabel className="mt-5">Partes</SectionLabel>
              <div className="mt-1 flex flex-col gap-1">
                {contexto.destinatarios.map((d, idx) => (
                  <div key={`${d.nome}-${idx}`} className="text-[11.5px]">
                    <span className="text-fg2">{d.nome}</span>
                    {d.oab && (
                      <span className="text-fg3 ml-1.5 font-mono text-[10px]">
                        OAB {d.oab}
                      </span>
                    )}
                    {d.matched && (
                      <span className="bg-primary/12 text-primary ml-1.5 rounded-full px-1.5 py-px text-[8.5px] font-semibold tracking-[0.03em] uppercase">
                        cliente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-fg3 mt-1 text-[11px]">Contexto indisponível.</p>
      )}

      <p className="text-fg3 mt-4 text-[11px] leading-[1.5]">
        A peça ainda não existe. Selecione as teses e clique{" "}
        <strong className="text-foreground font-medium">Gerar minuta</strong>{" "}
        para criá-la.
      </p>

      {sources.length > 0 && (
        <>
          <SectionLabel className="mt-5">Fundada em</SectionLabel>
          <div className="mt-1 flex flex-col gap-1.5">
            {sources.map((s) => (
              <div
                key={s.id}
                id={`fundada-em-${s.id}`}
                className={`bg-background flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                  highlightedDocId === s.id
                    ? "border-primary/50"
                    : "border-line"
                }`}
              >
                <FileText className="text-fg3 mt-px size-[13px] flex-none" />
                <span className="text-fg2 min-w-0 flex-1 truncate text-[11px]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tesesSlot}
    </div>
  );
}

/** Fontes distintas (por sourceDocumentId), preservando o primeiro rótulo visto. */
function dedupeSources(theses: Thesis[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const t of theses) {
    if (t.sourceDocumentId && !seen.has(t.sourceDocumentId)) {
      seen.set(t.sourceDocumentId, t.sourceLabel || "Documento");
    }
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

function Meta({ rot, val }: { rot: string; val: string }) {
  return (
    <>
      <dt className="text-fg3 text-[11px]">{rot}</dt>
      <dd className="text-fg2 text-right text-[11px]">{val || "—"}</dd>
    </>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase ${className}`}
    >
      {children}
    </div>
  );
}

function RailSkeleton() {
  return (
    <div className="mt-2 space-y-2">
      <div className="bg-hover h-3 w-32 animate-pulse rounded" />
      <div className="bg-hover h-16 w-full animate-pulse rounded-lg" />
      <div className="bg-hover h-20 w-full animate-pulse rounded-lg" />
    </div>
  );
}
