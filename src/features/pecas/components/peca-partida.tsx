"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Segmented } from "@/components/mock-ui/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type { IntimacaoType } from "@/features/intimacoes/types";
import {
  useGerarPeca,
  usePeca,
  useTheses,
} from "@/features/pecas/hooks/use-peca";
import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { formatClaimValueBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { PecaTone, Thesis, ThesisConfidence } from "../types";

// ── Constantes de tom ────────────────────────────────────────────────────────

const TOM_OPCOES: { valor: PecaTone; label: string }[] = [
  { valor: "tecnico-formal", label: "Técnico-formal" },
  { valor: "direto-assertivo", label: "Direto-assertivo" },
  { valor: "conciliador-institucional", label: "Conciliador-institucional" },
];

const MAX_INSTRUCTIONS = 2000;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

// ── Badge de confiança ────────────────────────────────────────────────────────

const CONFIDENCE_LABEL: Record<ThesisConfidence, string> = {
  alta: "alta confiança",
  media: "média confiança",
  baixa: "baixa confiança",
};

const CONFIDENCE_CLASS: Record<ThesisConfidence, string> = {
  alta: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  media: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  baixa: "bg-muted text-muted-foreground",
};

function ConfidenceBadge({ confidence }: { confidence: ThesisConfidence }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium tabular-nums",
        CONFIDENCE_CLASS[confidence],
      )}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

// ── Card de tese ─────────────────────────────────────────────────────────────

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
        "focus-visible:ring-ring w-full rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox visual */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex size-4 flex-none items-center justify-center rounded border transition-colors",
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

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] leading-snug font-medium">
              {thesis.label}
            </span>
            <ConfidenceBadge confidence={thesis.confidence} />
          </div>
          {thesis.reference && (
            <p className="text-muted-foreground text-[11.5px]">
              {thesis.reference}
            </p>
          )}
          {thesis.foundation && (
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              ↳ {thesis.foundation}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Tela de loading pós-generate ─────────────────────────────────────────────

function GeneratingScreen({ pieceType }: { pieceType: string }) {
  const label = rotuloTipoPeca(pieceType);
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="text-muted-foreground size-10 animate-spin" />
      <p className="font-display text-foreground/70 text-[21px]">
        Redigindo sua {label}…
      </p>
      <p className="text-muted-foreground text-[12.5px]">
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

  // Atualiza a ref no effect para não mutar durante render.
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

  // Observa saga_state: se terminat navega imediatamente.
  useEffect(() => {
    const state = peca?.saga_state;
    if (active && (state === "DRAFTED" || state === "FAILED")) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      onTerminalRef.current();
    }
  }, [peca?.saga_state, active]);

  // Arranca o polling quando active muda para true.
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
        // Timeout — força workspace.
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
  /** Callback chamado quando o workspace deve ser exibido (gerar ou pular). */
  onWorkspace: () => void;
}

export function PecaPartida({ id, onWorkspace }: PecaPartidaProps) {
  const { data: peca } = usePeca(id);
  const thesesQuery = useTheses(id);
  const gerarPeca = useGerarPeca();

  // Estado de tom — padrão: técnico-formal.
  const [tom, setTom] = useState<PecaTone>("tecnico-formal");

  // Estado de instruções.
  const [instrucoes, setInstrucoes] = useState("");
  const instrError =
    instrucoes.length > MAX_INSTRUCTIONS
      ? `Máximo de ${MAX_INSTRUCTIONS} caracteres. Você digitou ${instrucoes.length}.`
      : null;

  // Teses selecionadas — todas pré-selecionadas por padrão.
  const theses = useMemo(
    () => thesesQuery.data?.theses ?? [],
    [thesesQuery.data],
  );
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const semeado = useRef(false);

  // Semear seleção quando teses carregam (todas on por padrão).
  useEffect(() => {
    if (!semeado.current && theses.length > 0) {
      setSelecionadas(new Set(theses.map((_, i) => i)));
      semeado.current = true;
    }
  }, [theses]);

  // Controla se estamos aguardando o saga_state DRAFTED.
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
        onSuccess: () => setGerando(true),
      },
    );
  };

  const instrId = useId();
  const instrErrorId = `${instrId}-error`;

  if (gerando) {
    return <GeneratingScreen pieceType={peca?.piece_type ?? "BLANK"} />;
  }

  // Dados de contexto da peça.
  const proc = peca?.process ?? null;
  const intim = peca?.intimation ?? null;
  const prazo = peca?.deadline ?? null;
  const termo = prazo?.end_date ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const corPrazo = corDaUrgencia(urgenciaDe(dias));
  const tipoPecaLabel = rotuloTipoPeca(peca?.piece_type ?? "BLANK");

  return (
    <div className="min-h-screen">
      {/* Layout 2 colunas: principal + aside */}
      <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(560px,1fr)_330px]">
        {/* ── Coluna principal ── */}
        <main className="flex flex-col gap-8">
          {/* 1. Cabeçalho */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[var(--gold)] uppercase">
              Redigir com IA
            </p>
            <h1 className="font-display text-[28px] leading-tight font-medium">
              Vamos redigir sua {tipoPecaLabel}
            </h1>
            <p className="text-muted-foreground text-[13.5px] leading-relaxed">
              A IA parte da intimação e das providências desta tarefa. Oriente
              como conduzir — você revisa e refaz o que quiser antes de assinar.
            </p>
          </div>

          {/* 2. Painel "A IA vai usar" */}
          {(intim ?? proc ?? prazo) && (
            <section className="border-border bg-muted/40 rounded-xl border px-5 py-4">
              <p className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                A IA vai usar
              </p>
              <ul className="flex flex-col gap-2">
                {intim && (
                  <li className="flex items-start gap-2 text-[13px]">
                    <span
                      className="mt-0.5 size-1.5 flex-none rounded-full bg-[var(--gold)]"
                      aria-hidden="true"
                    />
                    <span>
                      {TYPE_LABEL[intim.type as IntimacaoType] ?? intim.type}
                    </span>
                  </li>
                )}
                {prazo && (
                  <li className="flex items-start gap-2 text-[13px]">
                    <span
                      className="mt-0.5 size-1.5 flex-none rounded-full bg-[var(--gold)]"
                      aria-hidden="true"
                    />
                    <span>
                      Prazo{" "}
                      <span
                        style={{ color: corPrazo }}
                        className="tabular-nums"
                      >
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
                {proc && (
                  <li className="flex items-start gap-2 text-[13px]">
                    <span
                      className="mt-0.5 size-1.5 flex-none rounded-full bg-[var(--gold)]"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground tabular-nums">
                      {proc.cnj_number}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* 3. Teses a sustentar */}
          <section>
            <div className="mb-1.5">
              <p className="text-[15px] font-semibold">Teses a sustentar</p>
              <p className="text-muted-foreground text-[13px]">
                A IA sugeriu estas — escolha as que entram.
              </p>
            </div>

            {thesesQuery.isPending ? (
              <div className="text-muted-foreground mt-3 flex items-center gap-2 text-[13px]">
                <Loader2 className="size-4 animate-spin" />
                Sugerindo teses…
              </div>
            ) : theses.length === 0 ? (
              <p className="border-border bg-muted/30 text-muted-foreground mt-3 rounded-lg border px-4 py-3 text-[13px]">
                {thesesQuery.isError
                  ? "Não foi possível sugerir teses agora. Continue sem selecionar ou tente novamente."
                  : "Nenhuma tese sugerida para esta peça."}
              </p>
            ) : (
              <div
                className="mt-3 flex flex-col gap-2"
                role="group"
                aria-label="Teses a sustentar"
              >
                {theses.map((t, i) => (
                  <ThesisCard
                    key={i}
                    thesis={t}
                    selected={selecionadas.has(i)}
                    onToggle={() => {
                      setSelecionadas((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 4. Tom da peça */}
          <section>
            <p className="mb-3 text-[15px] font-semibold">Tom da peça</p>
            <div role="radiogroup" aria-label="Tom da peça">
              <Segmented<PecaTone>
                valor={tom}
                opcoes={TOM_OPCOES}
                onChange={setTom}
              />
            </div>
          </section>

          {/* 5. Instruções à IA */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor={instrId} className="text-[15px] font-semibold">
                Instruções à IA
              </label>
              <span className="text-muted-foreground text-[12px]">
                opcional
              </span>
            </div>
            <Textarea
              id={instrId}
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              placeholder="Ex.: enfatize a ausência de contrato escrito e peça a extinção da execução."
              className="min-h-[76px] resize-y text-[13.5px]"
              aria-describedby={instrError ? instrErrorId : undefined}
              aria-invalid={instrError ? true : undefined}
            />
            {instrError && (
              <p
                id={instrErrorId}
                role="alert"
                className="text-destructive mt-1.5 text-[12px]"
              >
                {instrError}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-right text-[11.5px] tabular-nums">
              {instrucoes.length}/{MAX_INSTRUCTIONS}
            </p>
          </section>

          {/* 6. CTAs */}
          <div className="flex flex-col gap-3">
            {gerarPeca.isError && (
              <p role="alert" className="text-destructive text-[12.5px]">
                Não foi possível iniciar a geração. Tente novamente.
              </p>
            )}
            <Button
              size="lg"
              onClick={handleGerar}
              disabled={gerarPeca.isPending || !!instrError}
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 size-4" />
              {gerarPeca.isPending ? "Iniciando…" : "Gerar minuta"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onWorkspace}
              className="text-muted-foreground w-fit self-start text-[13px]"
            >
              Prefiro começar em branco
            </Button>
          </div>
        </main>

        {/* ── Aside "Como funciona" ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 flex flex-col gap-5">
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.12em] uppercase">
              Como funciona
            </p>

            <ol className="flex flex-col gap-5">
              {[
                {
                  n: 1,
                  titulo: "IA lê o contexto",
                  descricao:
                    "Analisa a intimação, o teor da publicação e os prazos do processo.",
                },
                {
                  n: 2,
                  titulo: "Você orienta",
                  descricao:
                    "Escolha as teses, o tom e acrescente instruções específicas se quiser.",
                },
                {
                  n: 3,
                  titulo: "Minuta gerada",
                  descricao:
                    "A IA redige uma versão completa que você revisa livremente antes de assinar.",
                },
                {
                  n: 4,
                  titulo: "Revisão e assinatura",
                  descricao:
                    "Edite, peça sugestões e assine. A autoria é sempre sua.",
                },
              ].map((passo) => (
                <li key={passo.n} className="flex items-start gap-3">
                  <span className="flex size-6 flex-none items-center justify-center rounded-full bg-[var(--gold)]/15 text-[11px] font-bold text-[var(--gold-foreground)]">
                    {passo.n}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold">
                      {passo.titulo}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[12.5px] leading-relaxed">
                      {passo.descricao}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Card de aviso */}
            <div className="border-border bg-muted/50 rounded-xl border px-4 py-4">
              <p className="text-muted-foreground text-[12.5px] leading-relaxed">
                Nenhuma peça é protocolada sem revisão humana. A IA redige e
                sugere; a assinatura e a autoria são sempre suas.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
