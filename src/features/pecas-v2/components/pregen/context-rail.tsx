"use client";

// Rail de contexto da Construção — ÚNICO, usado com ou sem draft (a partida
// alimenta com o contexto da intimação; a construção, com o do draft). Seções:
// CONTEXTO DO PROCESSO, card INTIMAÇÃO (+ "ver inteiro teor"), PARTES e FUNDADA EM
// (o Teor da intimação de origem é o 1º item — fundamentação — seguido dos autos).
// O bloco TESES A INCLUIR entra via `tesesSlot`.

import { FileText, Loader2, Mail, User } from "lucide-react";
import type { ReactNode } from "react";

import type {
  PecaContexto,
  PecaContextoDoc,
  PecaContextoParte,
} from "../../lib/peca-contexto";

interface Props {
  contexto: PecaContexto;
  /** Fonte em destaque por um clique de "ver fonte" numa tese. */
  highlightedDocId: string | null;
  /** Abre o drawer lateral com o teor/autos completo da intimação de origem. */
  onVerTeor: () => void;
  /** Abre o conteúdo de um documento dos autos (Fundada em) num drawer. */
  onVerAuto: (doc: PecaContextoDoc) => void;
  /** Id do auto cujo conteúdo está carregando — mostra spinner no item. */
  openingDocId: string | null;
  tesesSlot: ReactNode;
}

export function ContextRail({
  contexto,
  highlightedDocId,
  onVerTeor,
  onVerAuto,
  openingDocId,
  tesesSlot,
}: Props) {
  const { processo, intimacao, partes, autos } = contexto;
  return (
    <div className="border-line bg-panel w-72 flex-none overflow-y-auto border-r p-4">
      <SectionLabel>Contexto do processo</SectionLabel>

      <div className="mt-1 flex items-start gap-2.5">
        <FileText className="text-fg3 mt-0.5 size-[15px] flex-none" />
        <div className="min-w-0 flex-1">
          <div className="text-fg2 font-mono text-[11.5px]">
            {processo.cnj || "—"}
          </div>
          <div className="text-fg3 mt-px text-[11px]">{processo.classe}</div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px]">
        <Meta rot="Assunto" val={processo.assunto} />
        <Meta rot="Órgão" val={processo.orgao} />
        {processo.tribunalGrau && (
          <Meta rot="Tribunal" val={processo.tribunalGrau} />
        )}
        <Meta rot="Valor" val={processo.valor} />
      </dl>

      {/* Card INTIMAÇÃO */}
      <div className="border-line bg-background mt-4 overflow-hidden rounded-[10px] border">
        <div className="border-line2 flex items-center gap-[7px] border-b px-3 py-[9px]">
          <Mail className="text-primary size-[13px]" />
          <span className="text-fg2 text-[10.5px] font-semibold tracking-[0.05em] uppercase">
            Intimação
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px] px-3 py-[11px]">
          <Meta rot="Tipo" val={intimacao.tipoLabel} />
          <Meta rot="Publicação" val={intimacao.publishedAt} />
          <Meta rot="Prazo" val={intimacao.prazoLabel} strong />
        </dl>
        <div className="px-3 pb-[11px]">
          <p className="text-fg2 m-0 line-clamp-3 text-[11px] leading-[1.5]">
            <span className="text-fg3">Teor · </span>
            {intimacao.teor}
          </p>
          <button
            type="button"
            onClick={onVerTeor}
            className="text-primary mt-1.5 text-[11px] font-medium"
          >
            ver inteiro teor →
          </button>
        </div>
      </div>

      {/* PARTES */}
      {partes.length > 0 && (
        <>
          <SectionLabel className="mt-5">Partes</SectionLabel>
          <div className="mt-2 flex flex-col gap-1.5">
            {partes.map((pt, i) => (
              <PartyCard key={`${pt.roleLabel}-${i}`} party={pt} />
            ))}
          </div>
        </>
      )}

      {/* FUNDADA EM — o Teor da intimação de origem TAMBÉM é fundamentação, então
          entra como o 1º item (badge Teor), seguido dos autos/anexos. */}
      <div className="border-line2 mt-5 mb-[18px] h-5 border-b" />
      <div className="flex items-center gap-[7px]">
        <SectionLabel className="flex-1">Fundada em</SectionLabel>
        <span className="text-fg3 font-mono text-[10.5px]">
          {autos.length + 1}
        </span>
      </div>
      {/* Teor + autos rolam JUNTOS num único container com altura limitada — o teor
          faz parte da lista (não fica fixo), e o scroll evita empurrar as TESES. */}
      <div className="mt-2 flex max-h-[340px] flex-col gap-1.5 overflow-y-auto pr-0.5">
        <TeorSource
          id={`fundada-em-${intimacao.id}`}
          publishedAt={intimacao.publishedAt}
          teor={intimacao.teor}
          highlight={intimacao.id === highlightedDocId}
          onClick={onVerTeor}
        />
        {autos.length === 0 && (
          <p className="text-fg3 text-[11px] leading-[1.5]">
            Sem autos anexados — a peça se funda no teor da intimação. Anexe
            documentos do processo para ancorar mais teses.
          </p>
        )}
        {autos.map((a) => (
          <DocSource
            key={a.id}
            doc={a}
            highlight={a.id === highlightedDocId}
            opening={a.id === openingDocId}
            onClick={() => onVerAuto(a)}
          />
        ))}
      </div>

      {/* TESES A INCLUIR */}
      {tesesSlot}
    </div>
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
      className={
        "text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase " +
        className
      }
    >
      {children}
    </div>
  );
}

function Meta({
  rot,
  val,
  strong,
}: {
  rot: string;
  val: string;
  strong?: boolean;
}) {
  return (
    <>
      <dt className="text-fg3 text-[11px]">{rot}</dt>
      <dd
        className={
          strong
            ? "text-foreground text-[11.5px] font-semibold"
            : "text-fg2 text-[11.5px]"
        }
      >
        {val || "—"}
      </dd>
    </>
  );
}

/** Item "Intimação de origem" da FUNDADA EM — o Teor é fundamentação de 1ª classe
 *  (badge Teor), destacado com borda esquerda verde. Estima laudas pelo tamanho. */
function TeorSource({
  id,
  publishedAt,
  teor,
  highlight,
  onClick,
}: {
  id: string;
  publishedAt: string;
  teor: string;
  highlight: boolean;
  onClick: () => void;
}) {
  const laudas = Math.max(1, Math.round((teor?.length ?? 0) / 2100));
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={
        "card-hover grid w-full grid-cols-[15px_1fr_auto] items-center gap-[9px] rounded-[9px] border border-l-[3px] px-2.5 py-[9px] text-left transition-colors " +
        (highlight
          ? "border-l-green bg-selected"
          : "border-line border-l-green/50")
      }
    >
      <FileText className="text-green size-[14px] flex-none" />
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-medium">
          Intimação de origem
        </span>
        <span className="text-fg3 mt-px block text-[10.5px]">
          Publicado {publishedAt} · DJEN · ~{laudas} lauda
          {laudas > 1 ? "s" : ""}
        </span>
      </span>
      <span className="bg-green/15 text-green flex-none rounded-full px-[7px] py-0.5 text-[9px] font-medium">
        Teor
      </span>
    </button>
  );
}

/** Item de documento do caso (autos) na FUNDADA EM. Clicável — abre o PDF do
 *  documento numa aba nova (ver conteúdo). */
function DocSource({
  doc,
  highlight,
  opening,
  onClick,
}: {
  doc: PecaContextoDoc;
  highlight: boolean;
  opening: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`fundada-em-${doc.id}`}
      onClick={onClick}
      disabled={opening}
      title="Abrir documento"
      className={
        "card-hover grid w-full grid-cols-[15px_1fr_auto] items-center gap-[9px] rounded-[9px] border border-l-[3px] px-2.5 py-[9px] text-left transition-colors " +
        (highlight
          ? "border-l-primary bg-selected"
          : "border-line border-l-primary/40")
      }
    >
      {opening ? (
        <Loader2 className="text-primary size-[14px] flex-none animate-spin" />
      ) : (
        <FileText className="text-primary size-[14px] flex-none" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-medium">
          {doc.name}
        </span>
        <span className="text-fg3 mt-px block text-[10.5px]">{doc.meta}</span>
      </span>
      <span className="bg-primary/10 text-primary flex-none rounded-full px-[7px] py-0.5 text-[9px] font-medium">
        {doc.category}
      </span>
    </button>
  );
}

function PartyCard({ party }: { party: PecaContextoParte }) {
  return (
    <div
      className={
        "rounded-[9px] border px-2.5 py-[9px] " +
        (party.isClient
          ? "border-primary/35 bg-primary/[0.06]"
          : "border-line bg-background")
      }
    >
      <div className="flex items-center gap-1.5">
        <User className="text-fg3 size-3 flex-none" />
        <span className="min-w-0 truncate text-[12px] font-medium">
          {party.name}
        </span>
        {party.isClient && (
          <span className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 py-px text-[8.5px] font-semibold tracking-[0.03em]">
            CLIENTE
          </span>
        )}
      </div>
      <div className="text-fg3 mt-[3px] text-[10.5px]">
        {party.counselLabel
          ? `${party.roleLabel} · ${party.counselLabel}`
          : party.roleLabel}
      </div>
    </div>
  );
}
