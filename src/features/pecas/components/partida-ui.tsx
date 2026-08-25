// Componentes visuais compartilhados entre <PecaPartida> (peça já criada,
// fluxo legado) e <PartidaEphemeral> (peça ainda não criada, tela /pecas/nova).
// Só UI/marcação — nenhum hook de rede, nenhum estado global. Recebe tudo por
// props. Fiel ao protótipo "Atjus Fluxo v2.dc.html".

"use client";

import { useState } from "react";

import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import type { Party } from "@/features/processos/types";
import { cn } from "@/lib/utils";

import type { PecaTone, Thesis, ThesisConfidence } from "../types";

// ── Tom da peça (3 opções fiéis ao mockup, wire idêntico ao BE migração 0055) ─
export const TOM_OPCOES: { valor: PecaTone; label: string }[] = [
  { valor: "tecnico", label: "Técnico" },
  { valor: "objetivo", label: "Objetivo" },
  { valor: "enfatico", label: "Enfático" },
];

// ── Badge de confiança ──────────────────────────────────────────────────────

const CONFIDENCE_LABEL: Record<ThesisConfidence, string> = {
  alta: "alta confiança",
  media: "média confiança",
  baixa: "baixa confiança",
};

const CONFIDENCE_CLASS: Record<ThesisConfidence, string> = {
  alta: "bg-emerald-50 text-emerald-700",
  media: "bg-amber-50 text-amber-700",
  baixa: "bg-muted text-muted-foreground",
};

export function ConfidenceBadge({
  confidence,
}: {
  confidence: ThesisConfidence;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-[7px] py-px text-[9.5px] tracking-[0.05em] uppercase",
        CONFIDENCE_CLASS[confidence],
      )}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

// ── Card de tese selecionável ───────────────────────────────────────────────

export function ThesisCard({
  thesis,
  selected,
  onToggle,
}: {
  thesis: Thesis;
  selected: boolean;
  onToggle: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const hasEvidence = thesis.evidence.length > 0;
  return (
    <div
      className={cn(
        "rounded-[10px] border transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      {/* Linha principal — clique seleciona/deseleciona a tese */}
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className="focus-visible:ring-ring flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-px grid size-[18px] flex-none place-items-center rounded-md border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
          )}
        >
          {selected && (
            <svg
              viewBox="0 0 12 12"
              className="size-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-[12.5px]">
              {thesis.label}
            </span>
            <ConfidenceBadge confidence={thesis.confidence} />
          </span>
          {thesis.reference && (
            <span className="text-muted-foreground mt-px block text-[11px]">
              {thesis.reference}
            </span>
          )}
          {thesis.foundation && (
            <span className="text-muted-foreground mt-1 flex gap-1.5 text-[11px] leading-[1.45]">
              <span className="flex-none text-[var(--gold)]">↳</span>
              <span>{thesis.foundation}</span>
            </span>
          )}
        </span>
      </button>

      {/* Rodapé com evidências — toggle "Por quê?" separado do clique de
          seleção (evita drag-select acidental). Só aparece quando a IA
          conseguiu extrair trechos literais que sustentam a tese; sem
          evidência a tese é intrinsecamente "baixa" (prompt v2 força). */}
      {hasEvidence && (
        <div className="border-border/60 border-t px-3 pt-1.5 pb-2.5">
          <button
            type="button"
            onClick={() => setShowEvidence((v) => !v)}
            aria-expanded={showEvidence}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10.5px] font-medium tracking-[0.04em] uppercase transition-colors"
          >
            <span aria-hidden="true" className="inline-block w-2 text-center">
              {showEvidence ? "▾" : "▸"}
            </span>
            Por quê? ({thesis.evidence.length}{" "}
            {thesis.evidence.length === 1 ? "trecho" : "trechos"})
          </button>
          {showEvidence && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {thesis.evidence.map((quote, i) => (
                <li
                  key={i}
                  className="text-muted-foreground border-border/60 border-l-2 pl-2.5 text-[11.5px] leading-[1.5] italic"
                >
                  “{quote}”
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Segmented control do Tom ────────────────────────────────────────────────

export function TomSegmented({
  valor,
  onChange,
}: {
  valor: PecaTone;
  onChange: (v: PecaTone) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tom da peça"
      className="bg-muted/60 flex gap-0.5 rounded-[10px] p-[3px]"
    >
      {TOM_OPCOES.map((o) => {
        const ativo = valor === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={cn(
              "flex-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
              ativo
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tela de loading pós-generate ────────────────────────────────────────────

export function GeneratingScreen({ pieceType }: { pieceType: string }) {
  const label = rotuloTipoPeca(pieceType);
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-2 py-24 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="border-border border-t-primary size-10 animate-spin rounded-full border-2" />
      <p className="font-display mt-[22px] text-[21px]">
        Redigindo sua {label}…
      </p>
      <p className="text-muted-foreground mt-1.5 text-[12.5px]">
        Lendo o teor da intimação e estruturando os argumentos.
      </p>
    </div>
  );
}

// ── Bloco Partes (autor/réu + procuradores) ────────────────────────────────

// Render fiel ao print de referência: rótulo pequeno em cinza (Autor/Réu),
// nome da parte, e abaixo uma lista de procuradores no formato
// "Nome · OAB/UF nº 12345". Aceita 0..N partes por polo (multi-parte é comum
// em execuções e ações coletivas). Se um polo estiver vazio, esconde o bloco.
export function PartesBlock({ autor, reu }: { autor: Party[]; reu: Party[] }) {
  if (autor.length === 0 && reu.length === 0) return null;
  return (
    <>
      {autor.length > 0 && <PoloBlock rotulo="Autor" partes={autor} />}
      {reu.length > 0 && <PoloBlock rotulo="Réu" partes={reu} />}
    </>
  );
}

function PoloBlock({ rotulo, partes }: { rotulo: string; partes: Party[] }) {
  // Dedup fuzzy — o tribunal frequentemente registra a mesma entidade 2x
  // com sufixos societários diferentes ("EMPRESA X LTDA" e "EMPRESA X LTDA
  // ME"). Quando o CNPJ (document) é null nas duas E o nome-raiz é igual,
  // mantém só o registro mais informativo (nome mais longo). CNPJ diferente
  // = entidades legalmente distintas → mostra as duas.
  partes = dedupPartes(partes);
  // Quando TODAS as partes do polo têm os MESMOS procuradores (comum quando
  // matriz+subsidiária compartilham o escritório), renderiza a lista uma vez
  // no fim do polo — evita repetição visual. Se divergem, mostra sob cada
  // parte pra manter a associação clara.
  const counselsShared = allSameCounsels(partes);
  return (
    <div className="border-border border-b py-2 text-[12px]">
      <span className="text-muted-foreground block text-[11px]">{rotulo}</span>
      <div className="mt-1 flex flex-col gap-2.5">
        {partes.map((p, i) => (
          <div key={`${p.name}-${i}`}>
            <div className="text-foreground font-medium">{p.name}</div>
            {!counselsShared && p.counsels.length > 0 && (
              <CounselsList counsels={p.counsels} />
            )}
          </div>
        ))}
        {counselsShared && partes[0].counsels.length > 0 && (
          <CounselsList counsels={partes[0].counsels} />
        )}
      </div>
    </div>
  );
}

function CounselsList({ counsels }: { counsels: Party["counsels"] }) {
  return (
    <>
      <span className="text-muted-foreground mt-1 block text-[10.5px] tracking-[0.06em] uppercase">
        Procuradores
      </span>
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {counsels.map((c) => (
          <li
            key={`${c.name}-${c.oab}-${c.uf}`}
            className="text-muted-foreground text-[11.5px] leading-[1.4]"
          >
            {c.name}{" "}
            <span className="text-muted-foreground/80">
              · OAB/{c.uf} nº {c.oab}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// True quando todas as partes têm counsels idênticos (mesma tupla name/oab/uf
// em qualquer ordem). Uma parte sozinha ou zero partes = trivialmente shared.
function allSameCounsels(partes: Party[]): boolean {
  if (partes.length <= 1) return true;
  const key = (p: Party) =>
    [...p.counsels]
      .map((c) => `${c.name}|${c.oab}|${c.uf}`)
      .sort()
      .join("§");
  const first = key(partes[0]);
  return partes.every((p) => key(p) === first);
}

// Sufixos societários brasileiros que o tribunal costuma variar entre registros
// da MESMA entidade ("EMPRESA X LTDA" vs "EMPRESA X LTDA ME"). Lista ordenada
// por especificidade — os compostos vêm primeiro pra não deixar o "LTDA" da
// primeira passada quebrar o "LTDA ME" da segunda.
const SUFIXOS_SOCIETARIOS = [
  "LTDA ME",
  "LTDA EPP",
  "S/A",
  "S A",
  "S.A.",
  "SA",
  "EIRELI",
  "EPP",
  "ME",
  "LTDA",
  "MEI",
  "EM RECUPERACAO JUDICIAL",
  "EM RECUPERAÇÃO JUDICIAL",
  "EM RECUPERACAO EXTRAJUDICIAL",
  "EM LIQUIDACAO",
  "EM LIQUIDAÇÃO",
];

function nomeRaiz(nome: string): string {
  let s = nome
    .toUpperCase()
    .replace(/[.,\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Remove sufixos em loop até estabilizar (nome pode ter cadeia "LTDA ME EPP").
  for (let i = 0; i < 4; i++) {
    let mudou = false;
    for (const suf of SUFIXOS_SOCIETARIOS) {
      const re = new RegExp(`\\s+${suf}$`);
      if (re.test(s)) {
        s = s.replace(re, "").trim();
        mudou = true;
      }
    }
    if (!mudou) break;
  }
  return s;
}

// Dedup fuzzy: agrupa partes por nome-raiz quando CNPJ (document) é null nos
// duplicatas. Mantém o registro com nome mais longo (mais informativo).
// Preserva ordem original (primeiro representante de cada grupo).
function dedupPartes(partes: Party[]): Party[] {
  const grupos = new Map<string, Party>();
  for (const p of partes) {
    // CNPJ presente → identidade real, não dedup por nome.
    const chave = p.document ? `doc:${p.document}` : `nome:${nomeRaiz(p.name)}`;
    const existente = grupos.get(chave);
    if (!existente) {
      grupos.set(chave, p);
    } else if (p.name.length > existente.name.length) {
      // Substitui pelo nome mais longo (ex.: "X LTDA ME" ganha de "X LTDA").
      grupos.set(chave, p);
    }
  }
  return Array.from(grupos.values());
}

// ── Como funciona (coluna direita — passos 1-4) ─────────────────────────────

const PASSOS = [
  {
    n: 1,
    titulo: "Você orienta",
    descricao: "Escolhe as teses, o tom e escreve instruções.",
  },
  {
    n: 2,
    titulo: "A IA redige",
    descricao: "Uma primeira minuta a partir da intimação e das providências.",
  },
  {
    n: 3,
    titulo: "Você itera",
    descricao:
      "Refaz trechos, troca o tom ou reforça uma tese — quantas vezes precisar.",
  },
  {
    n: 4,
    titulo: "Assina e protocola",
    descricao: "Com a peça revisada e assumida por você.",
  },
];

export function ComoFuncionaAside() {
  return (
    <aside className="border-border overflow-y-auto border-l px-[18px] py-6">
      <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
        Como funciona
      </p>

      <ol className="mt-3.5 flex flex-col">
        {PASSOS.map((passo) => (
          <li
            key={passo.n}
            className="border-border grid grid-cols-[24px_1fr] gap-2.5 border-b py-2.5"
          >
            <span className="border-border text-muted-foreground grid size-[22px] place-items-center rounded-full border text-[11px] tabular-nums">
              {passo.n}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium">
                {passo.titulo}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11.5px] leading-[1.5]">
                {passo.descricao}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="border-border text-muted-foreground mt-[22px] rounded-xl border px-3.5 py-3 text-[11.5px] leading-[1.6]">
        Nenhuma peça é protocolada sem revisão humana. A IA redige e sugere; a
        assinatura e a autoria são sempre suas.
      </div>
    </aside>
  );
}
