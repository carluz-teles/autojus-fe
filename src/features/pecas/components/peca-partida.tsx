"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type { IntimacaoType } from "@/features/intimacoes/types";
import {
  useGerarPeca,
  usePeca,
  useTheses,
} from "@/features/pecas/hooks/use-peca";
import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import { diasRestantes, rotuloPrazo } from "@/features/shared/prazo";
import { formatClaimValueBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { PecaTone, Thesis, ThesisConfidence } from "../types";
import { PecaContexto, PecaTopBar } from "./peca-shell";

// Tom da peça — 3 opções curtas fiéis ao mockup "Atjus Fluxo v2.dc.html".
// Wire idêntico ao BE (migração 0055).
const TOM_OPCOES: { valor: PecaTone; label: string }[] = [
  { valor: "tecnico", label: "Técnico" },
  { valor: "objetivo", label: "Objetivo" },
  { valor: "enfatico", label: "Enfático" },
];

const MAX_INSTRUCTIONS = 2000;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

// ── Badge de confiança (fiel ao protótipo: uppercase, 9.5px, padding 1/7) ────

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

function ConfidenceBadge({ confidence }: { confidence: ThesisConfidence }) {
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

// ── Card de tese (fiel ao protótipo: radius 10px, padding 10/12, checkbox 18×18) ─

function ThesisCard({
  thesis,
  selected,
  onToggle,
}: {
  thesis: Thesis;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "focus-visible:ring-ring flex w-full items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      {/* Checkbox visual — 18×18px radius 6px */}
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
          <span className="text-foreground text-[12.5px]">{thesis.label}</span>
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
  );
}

// ── Segmented control do Tom (fiel ao protótipo, sem depender do mock-ui) ────

function TomSegmented({
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

// ── Tela de loading pós-generate ─────────────────────────────────────────────

function GeneratingScreen({ pieceType }: { pieceType: string }) {
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

// ── Hook de polling do saga_state ────────────────────────────────────────────

/**
 * Dispara polling com intervalo fixo após "gerar" até saga_state terminal.
 * Cancela no unmount. Nunca setState pós-unmount (usa `mounted` ref).
 */
function useSagaPolling({
  id,
  active,
  onTerminal,
}: {
  id: string;
  active: boolean;
  onTerminal: () => void;
}) {
  const { data: peca, refetch } = usePeca(id);
  const onTerminalRef = useRef(onTerminal);
  const mounted = useRef(true);

  useEffect(() => {
    onTerminalRef.current = onTerminal;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const state = peca?.saga_state;
    if (active && (state === "DRAFTED" || state === "FAILED")) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      onTerminalRef.current();
    }
  }, [peca?.saga_state, active]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    pollStartRef.current = Date.now();

    const tick = () => {
      if (!mounted.current) return;
      const elapsed = Date.now() - pollStartRef.current;
      if (elapsed >= POLL_TIMEOUT_MS) {
        onTerminalRef.current();
        return;
      }
      refetch().catch(() => null);
      timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [active, refetch]);
}

// ── Componente principal ──────────────────────────────────────────────────────

interface PecaPartidaProps {
  id: string;
  onWorkspace: () => void;
}

export function PecaPartida({ id, onWorkspace }: PecaPartidaProps) {
  const { data: peca } = usePeca(id);
  const thesesQuery = useTheses(id);
  const gerarPeca = useGerarPeca();

  const [tom, setTom] = useState<PecaTone>("tecnico");
  const [instrucoes, setInstrucoes] = useState("");
  const instrError =
    instrucoes.length > MAX_INSTRUCTIONS
      ? `Máximo de ${MAX_INSTRUCTIONS} caracteres.`
      : null;

  const theses = useMemo(
    () => thesesQuery.data?.theses ?? [],
    [thesesQuery.data],
  );
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const semeado = useRef(false);

  useEffect(() => {
    if (!semeado.current && theses.length > 0) {
      setSelecionadas(new Set(theses.map((_, i) => i)));
      semeado.current = true;
    }
  }, [theses]);

  const [gerando, setGerando] = useState(false);

  useSagaPolling({
    id,
    active: gerando,
    onTerminal: () => {
      setGerando(false);
      onWorkspace();
    },
  });

  const handleGerar = () => {
    if (instrError) return;
    const tesesSelecionadas = theses
      .filter((_, i) => selecionadas.has(i))
      .map((t) => t.label);

    gerarPeca.mutate(
      {
        id,
        body: {
          tone: tom,
          instructions: instrucoes.trim() || undefined,
          theses: tesesSelecionadas.length > 0 ? tesesSelecionadas : undefined,
        },
      },
      {
        // Assim que o BE aceita (202, saga já em EXTRACTING), navegamos pro
        // workspace — o streaming da geração (useDraftStream no EditorArea)
        // é o próprio feedback visual, tornando a spinner intermediária
        // desnecessária e apagando a ilusão de delay.
        onSuccess: () => onWorkspace(),
      },
    );
  };

  const instrId = useId();
  const instrErrorId = `${instrId}-error`;

  if (!peca) {
    if (gerando) return <GeneratingScreen pieceType="BLANK" />;
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  // ── Dados de contexto pra o painel "A IA vai usar" ────────────────────────
  const proc = peca.process;
  const intim = peca.intimation;
  const prazo = peca.deadline;
  const termo = prazo?.end_date ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const tipoPecaLabel = rotuloTipoPeca(peca.piece_type);
  const origemLabel = intim
    ? `${TYPE_LABEL[intim.type as IntimacaoType] ?? intim.type} — teor recebido em ${formatDate(intim.made_available_at)}`
    : null;

  return (
    <div className="flex h-full min-h-0 min-w-[1230px] flex-col overflow-x-auto">
      <PecaTopBar peca={peca} passo={1} />

      {gerando ? (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr]">
          <PecaContexto peca={peca} />
          <GeneratingScreen pieceType={peca.piece_type} />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(560px,1fr)_330px]">
          {/* Coluna esquerda — Contexto (mesma do workspace) */}
          <PecaContexto peca={peca} />

          {/* Coluna central — Vamos redigir sua {peça} */}
          <section className="overflow-y-auto">
            <div className="mx-auto max-w-[560px] px-10 pt-10 pb-14">
              {/* Cabeçalho */}
              <p className="text-[10.5px] tracking-[0.12em] text-[var(--gold)] uppercase">
                Redigir com IA
              </p>
              <h2 className="font-display mt-2 text-[28px] leading-[1.15] font-medium">
                Vamos redigir sua {tipoPecaLabel}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-[13px] leading-[1.6]">
                A IA parte da intimação e das providências desta tarefa. Oriente
                como conduzir — você revisa e refaz o que quiser antes de
                assinar.
              </p>

              {/* Painel "A IA vai usar" */}
              {(origemLabel || prazo) && (
                <div className="border-border bg-muted/40 my-6 rounded-xl border px-4 py-3.5">
                  <p className="text-muted-foreground mb-2 text-[10.5px] tracking-[0.1em] uppercase">
                    A IA vai usar
                  </p>
                  <ul className="flex flex-col gap-[7px] text-[12.5px] leading-[1.5]">
                    {origemLabel && (
                      <li className="flex gap-2">
                        <span className="text-[var(--gold)]">•</span>
                        <span>{origemLabel}</span>
                      </li>
                    )}
                    {prazo && (
                      <li className="flex gap-2">
                        <span className="text-[var(--gold)]">•</span>
                        <span>
                          Prazo{" "}
                          <span className="tabular-nums">
                            {formatDate(termo)}
                          </span>
                          {" · "}
                          {rotuloPrazo(dias)}
                          {proc?.claim_value
                            ? ` · valor ${formatClaimValueBRL(proc.claim_value)}`
                            : ""}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Teses a sustentar — título inline (12px + span 11px cinza) */}
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="text-[12px] font-medium">
                  Teses a sustentar
                </span>
                <span className="text-muted-foreground text-[11px]">
                  a IA sugeriu estas — escolha as que entram
                </span>
              </div>

              {thesesQuery.isPending ? (
                <div className="text-muted-foreground mt-3 flex items-center gap-2 text-[12.5px]">
                  <Loader2 className="size-4 animate-spin" />
                  Sugerindo teses…
                </div>
              ) : theses.length === 0 ? (
                <p className="border-border bg-muted/30 text-muted-foreground mt-2 rounded-[10px] border px-3 py-2.5 text-[12.5px]">
                  {thesesQuery.isError
                    ? "Não foi possível sugerir teses agora. Continue sem selecionar ou tente novamente."
                    : "Nenhuma tese sugerida para esta peça."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {theses.map((t) => {
                    const i = theses.indexOf(t);
                    return (
                      <ThesisCard
                        key={t.label}
                        thesis={t}
                        selected={selecionadas.has(i)}
                        onToggle={() =>
                          setSelecionadas((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                      />
                    );
                  })}
                </div>
              )}

              {/* Tom da peça */}
              <p className="mt-[22px] mb-2 text-[12px] font-medium">
                Tom da peça
              </p>
              <TomSegmented valor={tom} onChange={setTom} />

              {/* Instruções à IA */}
              <p className="mt-[22px] mb-2 text-[12px] font-medium">
                <label htmlFor={instrId}>Instruções à IA</label>{" "}
                <span className="text-muted-foreground font-normal">
                  opcional
                </span>
              </p>
              <textarea
                id={instrId}
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                placeholder="Ex.: enfatize a ausência de contrato escrito e peça a extinção da execução."
                className="border-border bg-card text-foreground focus-visible:ring-ring block min-h-[76px] w-full resize-y rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-[1.55] focus-visible:ring-2 focus-visible:outline-none"
                aria-describedby={instrError ? instrErrorId : undefined}
                aria-invalid={instrError ? true : undefined}
              />
              {instrError && (
                <p
                  id={instrErrorId}
                  role="alert"
                  className="text-destructive mt-1.5 text-[11.5px]"
                >
                  {instrError}
                </p>
              )}

              {/* CTAs lado a lado */}
              {gerarPeca.isError && (
                <p role="alert" className="text-destructive mt-4 text-[12.5px]">
                  Não foi possível iniciar a geração. Tente novamente.
                </p>
              )}
              <div className="mt-[22px] flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGerar}
                  disabled={gerarPeca.isPending || !!instrError}
                  className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-[11px] px-5 py-[11px] text-[13.5px] font-medium shadow-sm transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.94 5.34 12 2l2.06 3.34 3.9.86-2.6 3.02.36 3.96L12 15.6l-3.68 1.54.36-3.96-2.6-3.02 3.9-.86Z" />
                  </svg>
                  {gerarPeca.isPending ? "Iniciando…" : "Gerar minuta"}
                </button>
                <button
                  type="button"
                  onClick={onWorkspace}
                  className="text-muted-foreground hover:text-foreground p-2 text-[13px] transition-colors"
                >
                  Prefiro começar em branco
                </button>
              </div>
            </div>
          </section>

          {/* Coluna direita — Como funciona (grid 24px|1fr, border-b por item) */}
          <aside className="border-border overflow-y-auto border-l px-[18px] py-6">
            <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
              Como funciona
            </p>

            <ol className="mt-3.5 flex flex-col">
              {[
                {
                  n: 1,
                  titulo: "Você orienta",
                  descricao: "Escolhe as teses, o tom e escreve instruções.",
                },
                {
                  n: 2,
                  titulo: "A IA redige",
                  descricao:
                    "Uma primeira minuta a partir da intimação e das providências.",
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
              ].map((passo) => (
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

            {/* Card de aviso — apenas border + radius, sem fundo */}
            <div className="border-border text-muted-foreground mt-[22px] rounded-xl border px-3.5 py-3 text-[11.5px] leading-[1.6]">
              Nenhuma peça é protocolada sem revisão humana. A IA redige e
              sugere; a assinatura e a autoria são sempre suas.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
