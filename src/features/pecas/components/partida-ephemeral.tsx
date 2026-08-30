"use client";

// Variante da PecaPartida usada em /pecas/nova — a peça AINDA NÃO EXISTE. O
// state (tom, instruções, teses selecionadas) vive só em useState local. O
// POST /v1/pecas só acontece no clique de "Gerar" ou "Redigir manualmente" —
// evita rascunho zumbi cada vez que o advogado abre "Redigir peça" de uma
// intimação. Teses vêm de POST /v1/theses (variante sem draft_id).

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/mock-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIntimacaoDetalhe } from "@/features/intimacoes/hooks/use-intimacoes";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type { IntimacaoType } from "@/features/intimacoes/types";
import {
  useCriarPeca,
  useThesesFromIntimation,
} from "@/features/pecas/hooks/use-peca";
import { diasRestantes, rotuloPrazo } from "@/features/shared/prazo";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import type { PecaTone } from "../types";
import { ComoFuncionaAside, ThesisCard, TomSegmented } from "./partida-ui";
import { PecaContextoFromIntimacao } from "./peca-shell";

const MAX_INSTRUCTIONS = 2000;

// Tipos disponíveis pro select — closed set espelhando o BE
// (internal/draft/entity.go: DEFENSE|COMPLAINT|APPEAL|MOTION|OTHER). Ordem =
// frequência típica em execução/cumprimento (Defesa é o caso mais comum).
// "Outro" fica por último como fallback pra teor atípico.
const PIECE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "DEFENSE", label: "Defesa" },
  { value: "COMPLAINT", label: "Petição inicial" },
  { value: "APPEAL", label: "Recurso" },
  { value: "MOTION", label: "Petição" },
  { value: "OTHER", label: "Peça" },
];

interface Props {
  intimationId: string;
  /** Tipo inicial (default vindo da URL). O usuário troca inline no título —
   *  o state local vira a fonte de verdade a partir daí. */
  pieceType: string;
}

export function PartidaEphemeral({
  intimationId,
  pieceType: pieceTypeInicial,
}: Props) {
  const router = useRouter();
  // Tipo é state local: o usuário troca no <Select> inline do título. Quando
  // muda, o queryKey do useThesesFromIntimation muda → refetch automático.
  const [pieceType, setPieceType] = useState(pieceTypeInicial || "OTHER");
  const {
    data: intim,
    isLoading: intimLoading,
    error: intimError,
  } = useIntimacaoDetalhe(intimationId);
  const thesesQuery = useThesesFromIntimation(intimationId, pieceType);
  const criarPeca = useCriarPeca();

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
  // Reset da seleção quando o tipo muda — as teses velhas somem, novas chegam.
  // `semeado` volta a false; próximo effect re-selecciona todas as novas.
  const semeado = useRef(false);

  useEffect(() => {
    semeado.current = false;
    setSelecionadas(new Set());
  }, [pieceType]);

  useEffect(() => {
    if (!semeado.current && theses.length > 0) {
      setSelecionadas(new Set(theses.map((_, i) => i)));
      semeado.current = true;
    }
  }, [theses]);

  // Commit: cria peça e navega. Se mode="ai", persiste o payload de generate
  // em sessionStorage e navega — o /pecas/[id] lê o payload e dispara generate
  // DE DENTRO da rota nova. Isso garante que o useDraftStream monta ANTES de
  // o worker-ai emitir o primeiro token — se disparássemos generate aqui, o
  // gap entre `router.push` e `useDraftStream` conectar perderia o começo do
  // streaming.
  const commit = async (mode: "ai" | "manual") => {
    if (instrError) return;
    try {
      const peca = await criarPeca.mutateAsync({
        source: "intimation",
        intimation_id: intimationId,
        piece_type: pieceType,
      });

      if (mode === "ai") {
        const tesesSelecionadas = theses
          .filter((_, i) => selecionadas.has(i))
          .map((t) => t.label);
        sessionStorage.setItem(
          `pecas:autogen:${peca.id}`,
          JSON.stringify({
            tone: tom,
            instructions: instrucoes.trim() || undefined,
            theses:
              tesesSelecionadas.length > 0 ? tesesSelecionadas : undefined,
          }),
        );
        router.push(`/pecas/${peca.id}`);
      } else {
        router.push(`/pecas/${peca.id}?blank=1`);
      }
    } catch {
      // erros ficam no criarPeca.isError — o botão volta ao normal
    }
  };

  const instrId = useId();
  const instrErrorId = `${instrId}-error`;
  const isCommitting = criarPeca.isPending;
  const isError = criarPeca.isError;

  if (intimLoading) {
    return <div className="text-muted-foreground p-8 text-sm">Carregando…</div>;
  }

  // Mesmo padrão de processo-cockpit.tsx: sem isso, uma intimation_id
  // inexistente esgota os retries do React Query em silêncio e a tela fica
  // presa em "Carregando…" para sempre (QA achou isso ao vivo).
  if (intimError || !intim) {
    const isNotFound =
      intimError instanceof ApiError && intimError.kind === "ENTITY_NOT_FOUND";
    return (
      <div className="px-8 pt-10 text-center">
        <p role="alert" className="text-destructive text-sm">
          {isNotFound
            ? "Intimação não encontrada."
            : "Erro ao carregar a intimação. Tente novamente."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/pecas")}
        >
          Voltar para Peças
        </Button>
      </div>
    );
  }

  const prazo = intim.prazo;
  const termo = prazo?.end_date ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const tipoIntim = TYPE_LABEL[intim.type as IntimacaoType] ?? intim.type;
  const origemLabel = `${tipoIntim} — teor recebido em ${formatDate(intim.made_available_at)}`;

  return (
    <div className="flex h-full min-h-0 min-w-[1230px] flex-col overflow-x-auto">
      {/* Header enxuto (sem PecaTopBar — não tem peça pra referenciar) */}
      <div className="border-border flex items-center gap-3 border-b px-6 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-[12.5px]"
        >
          ← Voltar
        </button>
        <div className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase">
          Nova peça
        </div>
        {intim.cnj_number && (
          <div className="text-muted-foreground font-mono text-[11px]">
            · {intim.cnj_number}
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(560px,1fr)_330px]">
        {/* Coluna esquerda — usa o PecaContexto ÚNICO via adapter que busca a
            intimação por id. Sem draft criado (não passa pecaId), então
            Anexos não aparece — só na Construção. */}
        <PecaContextoFromIntimacao
          intimationId={intimationId}
          pieceType={pieceType}
        />

        {/* Coluna central — Vamos redigir sua {peça} */}
        <section className="overflow-y-auto">
          <div className="mx-auto max-w-[560px] px-10 pt-10 pb-14">
            <p className="text-[10.5px] tracking-[0.12em] text-[var(--gold)] uppercase">
              Redigir com IA
            </p>
            {/* Título com <Select> inline pra tipo. O user pode trocar sem
                sair da tela — teses refetcham (queryKey inclui pieceType) e
                a lista de sugestões se re-selecciona. Affordance visual:
                border tracejada + fundo primary/8 pra parecer clicável, senão
                se confunde com texto do título. */}
            <h2 className="font-display mt-2 flex flex-wrap items-baseline gap-2 text-[28px] leading-[1.15] font-medium">
              <span>Vamos redigir sua</span>
              <Select
                value={pieceType}
                onValueChange={(v) => v && setPieceType(v)}
              >
                <SelectTrigger
                  size="sm"
                  className="font-display text-primary bg-primary/8 hover:bg-primary/15 border-primary/30 hover:border-primary/60 h-auto w-auto gap-1.5 rounded-lg border border-dashed px-2.5 py-0.5 text-[28px] leading-[1.15] font-medium shadow-none transition-colors focus:ring-0 focus-visible:ring-0 [&_svg]:size-5 [&_svg]:opacity-80"
                >
                  <SelectValue>
                    {PIECE_TYPE_OPTIONS.find((o) => o.value === pieceType)
                      ?.label ?? "Peça"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PIECE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </h2>
            <p className="text-muted-foreground mt-1 text-[11.5px]">
              Toque em{" "}
              <span className="text-primary font-medium">
                {PIECE_TYPE_OPTIONS.find((o) => o.value === pieceType)?.label ??
                  "Peça"}
              </span>{" "}
              pra trocar o tipo — as teses são re-sugeridas.
            </p>
            <p className="text-muted-foreground mt-1.5 text-[13px] leading-[1.6]">
              A IA parte da intimação e das providências desta tarefa. Oriente
              como conduzir — você revisa e refaz o que quiser antes de assinar.
            </p>

            <div className="border-border bg-muted/40 my-6 rounded-xl border px-4 py-3.5">
              <p className="text-muted-foreground mb-2 text-[10.5px] tracking-[0.1em] uppercase">
                A IA vai usar
              </p>
              <ul className="flex flex-col gap-[7px] text-[12.5px] leading-[1.5]">
                <li className="flex gap-2">
                  <span className="text-[var(--gold)]">•</span>
                  <span>{origemLabel}</span>
                </li>
                {prazo && (
                  <li className="flex gap-2">
                    <span className="text-[var(--gold)]">•</span>
                    <span>
                      Prazo{" "}
                      <span className="tabular-nums">{formatDate(termo)}</span>
                      {" · "}
                      {rotuloPrazo(dias)}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <span className="text-[12px] font-medium">Teses a sustentar</span>
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
                {theses.map((t, i) => (
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
                ))}
              </div>
            )}

            <p className="mt-[22px] mb-2 text-[12px] font-medium">
              Tom da peça
            </p>
            <TomSegmented valor={tom} onChange={setTom} />

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

            {isError && (
              <p role="alert" className="text-destructive mt-4 text-[12.5px]">
                Não foi possível iniciar. Tente novamente.
              </p>
            )}
            <div className="mt-[22px] flex items-center gap-3">
              <button
                type="button"
                onClick={() => commit("ai")}
                disabled={isCommitting || !!instrError}
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
                {isCommitting ? "Iniciando…" : "Gerar minuta"}
              </button>
              <button
                type="button"
                onClick={() => commit("manual")}
                disabled={isCommitting}
                className="text-muted-foreground hover:text-foreground p-2 text-[13px] transition-colors disabled:opacity-60"
              >
                Prefiro começar em branco
              </button>
            </div>
          </div>
        </section>

        <ComoFuncionaAside />
      </div>
    </div>
  );
}
