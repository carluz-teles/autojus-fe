"use client";

import { ArrowRight, Building2, CircleCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type Facet, FacetedFilter } from "@/components/ui/faceted-filter";
import { corTextoUrgencia } from "@/features/intimacoes/components/shared/prazo-urgencia";
import { tipoAtoChipLabel } from "@/features/intimacoes/lib/tipo-ato";
import { URGENCIA_TABS } from "@/features/intimacoes/lib/urgencia-tabs";
import type {
  IntimacaoOrigem,
  IntimacaoView,
  IntimacoesBuckets,
} from "@/features/intimacoes/types";
import { cn } from "@/lib/utils";

import { useTriagem } from "../hooks/use-triagem";
import {
  type AbaOrigem,
  abasVisiveis,
  ORIGEM_LABEL,
  ORIGEM_TOM,
  ORIGEM_TOM_CLASS,
} from "../lib/origem";
import { prazoAcessivelLabel, prazoRelativoLabel } from "../lib/prazo-relativo";

// ─────────────────────────────────────────────────────────────────────────────
// TriagemView — fila real das intimações que ainda não viraram tarefa
// (work_stage ∈ {RECEIVED, AWAITING_CONFIRMATION, CONFIRMED}). Layout fiel ao
// Claude Design (.triagem-design-ref.html): topbar do shell de 44px + barra
// "Filtrar" (órgão) + fileira de tabs POR ORIGEM DO PRAZO + fileira de pills POR
// URGÊNCIA + lista de CARDS (borda arredondada). Sem seleção em massa (o usuário
// removeu Atribuir/Adiar) e sem responsável no card. As abas de origem são
// dinâmicas (só origens com facet > 0). Cada card tem seu próprio "Analisar →"
// (Link pra /intimacoes/:id — padrão do app inteiro, nunca router.push).
// ─────────────────────────────────────────────────────────────────────────────

export function TriagemView() {
  // Aba de origem — null = "Todos" (sem ?origem=). As duas facetas do design
  // (órgão + urgência) são server-side via ?court= / ?urgencia=. urgência tem
  // DOIS acessos (pill na fileira + faceta no filtro) refletindo o MESMO estado.
  const [origem, setOrigem] = useState<IntimacaoOrigem | null>(null);
  const [court, setCourt] = useState("");
  const [urgencia, setUrgencia] = useState("");

  const {
    itens,
    totalCount,
    origemFacets,
    buckets,
    filterOptions,
    isPending,
    isFetching,
    error,
  } = useTriagem({
    origem: origem ?? undefined,
    court: court || undefined,
    urgencia: urgencia || undefined,
  });

  // Faceta "Órgão": tribunais distintos do envelope. Só a monta se o BE trouxe
  // opções (senão a faceta não aparece — não inventa opção em filtro real).
  const facetas: Facet[] = useMemo(() => {
    const courts = filterOptions["court"] ?? [];
    if (courts.length === 0) return [];
    return [{ key: "court", label: "Órgão", icon: Building2, options: courts }];
  }, [filterOptions]);

  const temFiltro = court !== "" || urgencia !== "";

  if (isPending) return <TriagemEsqueleto />;

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar contagem={totalCount} />
        <p role="alert" className="text-destructive p-4 text-sm">
          Não foi possível carregar as intimações. Tente novamente.
        </p>
      </div>
    );
  }

  const abas = abasVisiveis(origemFacets);

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar contagem={totalCount} />

      {/* ── Barra "Filtrar" (órgão) + chips + Limpar ── */}
      <div className="border-line2 flex flex-none flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <FacetedFilter
          label="Filtrar"
          className="text-muted-foreground hover:text-foreground h-auto rounded-[7px] border-dashed bg-transparent px-2.5 py-1.5 text-[12px] font-normal"
          facets={facetas}
          values={{ court }}
          onChange={(_key, value) => setCourt(value)}
          onClear={() => setCourt("")}
        />
        {court && facetas.length > 0 ? (
          <FiltroChip
            label="Órgão"
            valor={rotuloCourt(facetas[0], court)}
            onRemover={() => setCourt("")}
          />
        ) : null}
        {urgencia ? (
          <FiltroChip
            label="Urgência"
            valor={urgenciaLabel(urgencia)}
            onRemover={() => setUrgencia("")}
          />
        ) : null}
        {temFiltro ? (
          <button
            type="button"
            onClick={() => {
              setCourt("");
              setUrgencia("");
            }}
            className="text-muted-foreground cursor-pointer px-1 py-[5px] text-[11.5px] underline"
          >
            Limpar
          </button>
        ) : null}
      </div>

      {/* ── Fileira de tabs POR ORIGEM ── */}
      <AbasOrigem abas={abas} ativa={origem} onSelecionar={setOrigem} />

      {/* ── Fileira de pills POR URGÊNCIA ── */}
      <PillsUrgencia
        buckets={buckets}
        ativa={urgencia}
        onSelecionar={setUrgencia}
      />

      {/* ── Lista de cards ── */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3 transition-opacity",
          // Troca de filtro: escurece a lista carregada enquanto o novo fetch
          // resolve (isPending só é true no 1º load — keepPreviousData mantém os
          // itens anteriores).
          isFetching && "opacity-60",
        )}
        aria-busy={isFetching}
      >
        {itens.length === 0 ? (
          <div className="text-muted-foreground px-6 py-[52px] text-center">
            <CircleCheck
              className="text-green mx-auto size-[26px]"
              strokeWidth={1.7}
              aria-hidden
            />
            <p className="text-foreground mt-2.5 text-[13px] font-medium">
              Nenhuma intimação pendente de análise
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {itens.map((item) => (
              <li key={item.id}>
                <CardTriagem item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Topbar do shell (44px) ───────────────────────────────────────────────────
// Mesmo padrão da Pipeline (prazos-view TopBar): ícone da view + título 13px/500
// + contagem mono 11px, border-b, h-11, px-4, gap-2.5. O ícone é o mesmo da
// sidebar (ListChecks).
function TopBar({ contagem }: { contagem: number }) {
  return (
    <header className="border-line flex h-11 flex-none items-center gap-2.5 border-b px-4">
      <ListChecks className="text-fg2 size-4" strokeWidth={1.9} />
      <span className="text-[13px] font-medium">Triagem</span>
      <span className="text-fg3 font-mono text-[11px]">
        {contagem.toLocaleString("pt-BR")}
      </span>
    </header>
  );
}

// ── Chip de filtro ativo ─────────────────────────────────────────────────────
// "{label}: {valor}" + X (padrão filtroBar.chips do design).
function FiltroChip({
  label,
  valor,
  onRemover,
}: {
  label: string;
  valor: string;
  onRemover: () => void;
}) {
  return (
    <span className="border-border bg-card inline-flex items-center gap-1.5 rounded-[7px] border py-[5px] pr-[5px] pl-2.5 text-[12px]">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{valor}</span>
      <button
        type="button"
        onClick={onRemover}
        aria-label={`Remover filtro ${label}`}
        className="text-muted-foreground hover:bg-muted grid size-4 cursor-pointer place-items-center rounded"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ── Fileira de tabs por origem ───────────────────────────────────────────────
// Pill arredondada (rounded-full) com rótulo + contagem mono. Ativa = accent
// (--primary); inativa = borda --line / fundo transparente. overflow-x-auto.
function AbasOrigem({
  abas,
  ativa,
  onSelecionar,
}: {
  abas: AbaOrigem[];
  ativa: IntimacaoOrigem | null;
  onSelecionar: (origem: IntimacaoOrigem | null) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por origem do prazo"
      className="border-line2 flex flex-none items-center gap-1.5 overflow-x-auto border-b px-4 py-2.5"
    >
      {abas.map((aba) => {
        const ativo = aba.value === ativa;
        return (
          <button
            key={aba.value ?? "todos"}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onSelecionar(aba.value)}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:outline-none",
              ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50 bg-transparent",
            )}
          >
            {aba.label}
            <span className="font-mono text-[10.5px] opacity-75">
              {aba.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Fileira de pills por urgência ────────────────────────────────────────────
// Label "Urgência" (uppercase 10px --fg3) + pills por bucket (rounded-full,
// 12px/500, contagem mono 10px). REUSA URGENCIA_TABS + os `buckets` do envelope
// (mesma fonte da tela de Intimações). Toggle: clicar a pill ativa limpa o
// filtro. Espelha o MESMO ?urgencia= da faceta do filtro.
function PillsUrgencia({
  buckets,
  ativa,
  onSelecionar,
}: {
  buckets: IntimacoesBuckets;
  ativa: string;
  onSelecionar: (valor: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por urgência"
      className="border-line2 flex flex-none items-center gap-1.5 overflow-x-auto border-b px-4 py-2"
    >
      <span className="text-muted-foreground mr-0.5 flex-none text-[10px] tracking-[0.04em] uppercase">
        Urgência
      </span>
      {URGENCIA_TABS.map((t) => {
        const ativo = ativa === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onSelecionar(ativo ? "" : t.value)}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-full border px-[11px] py-[5px] text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:outline-none",
              ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50 bg-transparent",
            )}
          >
            {t.label}
            <span className="font-mono text-[10px] opacity-75">
              {buckets[t.bucketKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Card da lista ────────────────────────────────────────────────────────────
// border + rounded-[10px] + px-[14px] py-[11px] + bg-card. Grid 1fr auto (sem
// checkbox — sem seleção em massa). Conteúdo: título 13px/500 + selo de origem
// inline; linha 2 = partes (autor · réu) 11.5px --fg3 truncada. Ações: prazo
// mono 11.5px/500 (cor por urgência) + "Analisar →" (accent-tinted).
function CardTriagem({ item }: { item: IntimacaoView }) {
  const corTexto = corTextoUrgencia(item.prazo);
  const prazoLabel = prazoRelativoLabel(item.prazo);
  const prazoAcessivel = prazoAcessivelLabel(item.prazo);
  const partes = partesLabel(item);

  return (
    <div className="border-border bg-card grid grid-cols-[1fr_auto] items-center gap-3 rounded-[10px] border px-[14px] py-[11px]">
      <div className="min-w-0">
        <div className="mb-[3px] flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{item.title}</span>
          <TipoAtoChip tipoAto={item.prazo?.tipo_ato ?? ""} />
          <SeloOrigem origem={item.estado} />
        </div>
        {partes ? (
          <div className="text-muted-foreground truncate text-[11.5px]">
            {partes}
          </div>
        ) : null}
      </div>

      <div className="flex flex-none items-center gap-2.5">
        <span
          className="font-mono text-[11.5px] font-medium"
          style={{ color: corTexto }}
        >
          {prazoLabel}
        </span>
        <Link
          href={`/intimacoes/${item.id}`}
          aria-label={`Analisar intimação, ${item.title}, ${prazoAcessivel}`}
          className="border-primary/45 bg-primary/[0.07] text-primary inline-flex items-center gap-1 rounded-[7px] border px-3 py-1.5 text-xs font-medium no-underline transition-colors hover:no-underline"
        >
          Analisar
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Chip do TIPO DE ATO (o "o que fazer": Contestação, Manifestação, Cumprimento de
 *  sentença…). Neutro/outline pra não competir com o selo de estado (colorido por tom).
 *  Oculto quando o estado já comunica o caso (ciência/indeterminado) — ver tipoAtoChipLabel. */
function TipoAtoChip({ tipoAto }: { tipoAto: string }) {
  const label = tipoAtoChipLabel(tipoAto);
  if (!label) return null;
  return (
    <span className="border-border text-foreground/80 inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium">
      {label}
    </span>
  );
}

/** Selo de origem inline (pill). Cor por tom (confiável=verde, a apurar=âmbar,
 *  neutro=cinza) — ver ORIGEM_TOM. "" quando o BE não mandou origem. */
function SeloOrigem({ origem }: { origem: string }) {
  if (!isOrigem(origem)) return null;
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
        ORIGEM_TOM_CLASS[ORIGEM_TOM[origem]],
      )}
    >
      {ORIGEM_LABEL[origem]}
    </span>
  );
}

function isOrigem(value: string): value is IntimacaoOrigem {
  return value in ORIGEM_LABEL;
}

/** Subtítulo de partes ("Autor · Réu") — omite o polo ausente; "" quando ambos
 *  ausentes (o card não renderiza a linha). Não mostra responsável. */
function partesLabel(item: IntimacaoView): string {
  return [item.autor, item.reu].filter(Boolean).join(" · ");
}

/** Rótulo pt-BR de uma opção de tribunal ativa (fallback = o próprio valor). */
function rotuloCourt(facet: Facet, value: string): string {
  return facet.options.find((o) => o.value === value)?.label ?? value;
}

/** Rótulo pt-BR de um valor de urgência (fallback = o próprio valor). */
function urgenciaLabel(value: string): string {
  return URGENCIA_TABS.find((t) => t.value === value)?.label ?? value;
}

function TriagemEsqueleto() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-line flex h-11 flex-none items-center gap-2.5 border-b px-4">
        <div className="bg-muted size-4 animate-pulse rounded" />
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </header>
      <div className="border-line2 border-b px-4 py-2.5">
        <div className="bg-muted h-7 w-20 animate-pulse rounded-[7px]" />
      </div>
      <div className="border-line2 flex gap-1.5 border-b px-4 py-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-7 w-24 animate-pulse rounded-full"
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card flex items-center justify-between rounded-[10px] border px-[14px] py-[11px]"
          >
            <div className="min-w-0 flex-1">
              <div className="bg-muted h-3.5 w-48 animate-pulse rounded" />
              <div className="bg-muted mt-1.5 h-3 w-64 animate-pulse rounded" />
            </div>
            <div className="bg-muted ml-4 h-7 w-20 animate-pulse rounded-[7px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
