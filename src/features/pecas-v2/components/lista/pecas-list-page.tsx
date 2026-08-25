"use client";

// Tela /pecas (v2) — hub do fluxo de peticionamento. Estrutura fiel ao print
// do design system:
//   header + subtítulo + Nova peça (CTA)
//   4 KPIs (Rascunhos | Em revisão | Aguardando assinatura | Protocoladas 30d)
//   busca + chips + botão Filtros
//   "Começar uma nova peça" (3 tipos rápidos)
//   "Peças recentes" (grid de 5 cards)
//
// Fonte de dados: usePecas (lista paginada). KPIs derivam dos flags/timestamps
// no read model. "Nova peça" abre o NovaPecaModal — o modal cria via POST
// /v1/pecas e navega pro fluxo padrão (/pecas/[id]).

import {
  CircleCheck,
  Clock,
  FileEdit,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePecas } from "@/features/pecas/hooks/use-peca";
import type { PecaListItem } from "@/features/pecas/types";

import { deriveEstado, type EstadoPeca } from "./estado-badge";
import { NovaPecaModal } from "./nova-peca-modal";
import { PecaRecenteCard } from "./peca-recente-card";
import { PieceTypeCard } from "./piece-type-card";

// Chips com o filtro correspondente que vai pro BE (workflow_state ou urgencia).
// "minhas" ainda não filtra (débito: BE não expõe created_by no read model);
// mantido no set pra a UX aparecer.
interface FiltroChip {
  key: string;
  label: string;
  urgencia?: string;
  workflow_state?: string;
}
const FILTRO_CHIPS: FiltroChip[] = [
  { key: "atraso", label: "Prazo em atraso", urgencia: "atraso" },
  { key: "hoje", label: "Prazo hoje", urgencia: "hoje" },
  { key: "minhas", label: "Minhas" },
  {
    key: "aguardando",
    label: "Aguardando assinatura",
    workflow_state: "aguardando_assinatura",
  },
];

export function PecasListPage() {
  const [busca, setBusca] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [novaAberto, setNovaAberto] = useState(false);

  // Traduz o chip ativo em query params do BE.
  const chipCfg = FILTRO_CHIPS.find((c) => c.key === chip);
  const { items: pecas, isPending } = usePecas({
    workflow_state: chipCfg?.workflow_state,
    urgencia: chipCfg?.urgencia,
  });

  // KPIs derivados. "Protocoladas (30d)" filtra por filed_at nos últimos 30d.
  const kpis = useMemo(() => contarKpis(pecas), [pecas]);

  // Busca client-side sobre o resultado já filtrado no server (chips).
  // Server filtra por workflow_state/urgencia; aqui só a busca livre por
  // título/CNJ. Chip "minhas" ainda não filtra (débito created_by no BE).
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pecas;
    return pecas.filter((p) =>
      `${p.title} ${p.piece_type} ${p.cnj_number ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [pecas, busca]);

  const recentes = filtradas.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-foreground text-3xl leading-tight font-medium">
            Peças
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Minutas em construção, assinadas e protocoladas — cada peça nasce de
            uma intimação.
          </p>
        </div>
        <Button onClick={() => setNovaAberto(true)}>Nova peça</Button>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          rotulo="Rascunhos"
          valor={kpis.rascunhos}
          icone={<FileText className="size-4" />}
        />
        <KpiCard
          rotulo="Em revisão"
          valor={kpis.revisao}
          icone={<FileEdit className="size-4" />}
        />
        <KpiCard
          rotulo="Aguardando assinatura"
          valor={kpis.aguardando}
          icone={<Clock className="size-4" />}
        />
        <KpiCard
          rotulo="Protocoladas (30d)"
          valor={kpis.protocoladas30d}
          icone={<CircleCheck className="size-4" />}
        />
      </div>

      {/* Search + Chips + Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="border-border bg-background focus-within:border-primary/50 relative flex min-w-[240px] flex-1 items-center rounded-md border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <input
            type="search"
            placeholder="Buscar nesta lista…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ml-2 flex-1 bg-transparent py-2 text-[12.5px] outline-none"
          />
        </div>
        {FILTRO_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setChip(chip === c.key ? null : c.key)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${chip === c.key ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className="border-border bg-card text-muted-foreground hover:bg-muted/40 ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium"
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
        </button>
      </div>

      {/* Começar uma nova peça */}
      <div className="mt-8">
        <Rotulo>Começar uma nova peça</Rotulo>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PieceTypeCard
            titulo="Defesa"
            subtitulo="Execução ou cumprimento"
            onClick={() => setNovaAberto(true)}
          />
          <PieceTypeCard
            titulo="Contestação"
            subtitulo="Procedimento comum"
            onClick={() => setNovaAberto(true)}
          />
          <PieceTypeCard
            titulo="Petição"
            subtitulo="Juntada · ciência · requerimento"
            onClick={() => setNovaAberto(true)}
          />
        </div>
      </div>

      {/* Peças recentes */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <Rotulo>Peças recentes</Rotulo>
          <span className="text-muted-foreground text-[11.5px]">
            {isPending
              ? "Carregando…"
              : `Mostrando ${recentes.length} peça${recentes.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {recentes.map((p) => (
            <PecaRecenteCard
              key={p.id}
              id={p.id}
              titulo={pieceTypeLabel(p.piece_type)}
              subtitulo={subtituloDe(p)}
              cnj={p.cnj_number ?? ""}
              estado={deriveEstadoPeca(p)}
              autorNome={p.responsible_name || undefined}
              dataLabel={formatarDataCurta(p.created_at)}
            />
          ))}
          {!isPending && recentes.length === 0 && (
            <p className="text-muted-foreground col-span-full py-8 text-center text-[13px]">
              Nenhuma peça recente. Use{" "}
              <strong className="text-foreground">Nova peça</strong> pra
              começar.
            </p>
          )}
        </div>
      </div>

      <NovaPecaModal
        aberto={novaAberto}
        onFechar={() => setNovaAberto(false)}
      />
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

function KpiCard({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string;
  valor: number;
  icone: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[10.5px] font-medium tracking-[0.08em] uppercase">
          {rotulo}
        </span>
        <span className="text-muted-foreground">{icone}</span>
      </div>
      <div className="text-foreground font-display mt-2 text-[28px] leading-none tabular-nums">
        {valor}
      </div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10.5px] font-medium tracking-[0.1em] uppercase">
      {children}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Deriva o estado com todos os timestamps do BE. Ordem de precedência:
// filed_at → protocolada; signed_at → aguardando protocolo; sent_to_signing_at
// → assinada (aguardando assinatura, na verdade); REVIEWED → revisada; senão
// rascunho.
function deriveEstadoPeca(p: PecaListItem): EstadoPeca {
  return deriveEstado({
    status: p.status,
    saga_state: p.saga_state,
    sent_to_signing_at: p.sent_to_signing_at,
    signed_at: p.signed_at,
    filed_at: p.filed_at,
  });
}

function contarKpis(pecas: PecaListItem[]) {
  const now = Date.now();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  let rascunhos = 0,
    revisao = 0,
    aguardando = 0,
    protocoladas30d = 0;
  for (const p of pecas) {
    // Aguardando assinatura: mandada pra assinar mas ainda não assinada.
    if (p.sent_to_signing_at && !p.signed_at) aguardando++;
    else if (p.status === "DRAFT" && p.saga_state === "REVIEWED") revisao++;
    else if (p.status === "DRAFT") rascunhos++;
    if (p.filed_at) {
      const filedAt = new Date(p.filed_at).getTime();
      if (now - filedAt <= trintaDias) protocoladas30d++;
    }
  }
  return { rascunhos, revisao, aguardando, protocoladas30d };
}

// Closed set alinhado ao BE. Legados mantidos como fallback pra rows antigas.
const PIECE_TYPE_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  COMPLAINT: "Petição inicial",
  APPEAL: "Recurso",
  MOTION: "Petição",
  OTHER: "Peça",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};
function pieceTypeLabel(t: string): string {
  return PIECE_TYPE_LABEL[t] ?? t;
}

// Subtitulo do card: pula quando o título é só o default "<Tipo>" ou vazio
// (redundante com o próprio card.titulo). Mostra quando o advogado renomeou.
function subtituloDe(p: PecaListItem): string | undefined {
  const t = (p.title ?? "").trim();
  if (!t) return undefined;
  const label = PIECE_TYPE_LABEL[p.piece_type] ?? "";
  if (t === label) return undefined;
  return t;
}

function formatarDataCurta(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
