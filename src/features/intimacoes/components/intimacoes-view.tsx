"use client";

import { AlarmClock, Clock, Inbox, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Kpi } from "@/components/mock-ui/data-display";
import { PageHeader } from "@/components/mock-ui/layout";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatarData } from "@/lib/utils";

import {
  type IntimacoesFilters,
  useIntimacoes,
  useIntimacoesSummary,
} from "../hooks/use-intimacoes";
import { TYPE_LABEL, USER_STATUS_LABEL } from "../lib/labels";
import type { IntimacaoView, IntimacoesBuckets } from "../types";

// Urgência derivada de prazo.days_left (inteiro do BE): 5 buckets mutuamente
// exclusivos alinhados com o contrato BE (IntimacoesBuckets).
type Urgencia = "atraso" | "hoje" | "semana" | "mais" | "sem";

function urgenciaView(prazo: IntimacaoView["prazo"]): Urgencia {
  if (!prazo) return "sem";
  const d = prazo.days_left;
  if (d < 0) return "atraso";
  if (d === 0) return "hoje";
  if (d <= 7) return "semana";
  return "mais";
}

function corDaUrgenciaView(u: Urgencia): string {
  return {
    atraso: "var(--destructive)",
    hoje: "var(--gold)",
    semana: "var(--muted-foreground)",
    mais: "var(--info)",
    sem: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  }[u];
}

function rotuloPrazoView(prazo: IntimacaoView["prazo"]): string {
  if (!prazo) return "sem prazo";
  const d = prazo.days_left;
  if (d < 0) return `${Math.abs(d)} dias em atraso`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `em ${d} dias`;
}

const GRUPOS: {
  label: string;
  urgencia: Urgencia;
  bucketKey: keyof IntimacoesBuckets;
}[] = [
  { label: "Em atraso", urgencia: "atraso", bucketKey: "atraso" },
  { label: "Vence hoje", urgencia: "hoje", bucketKey: "hoje" },
  { label: "Esta semana", urgencia: "semana", bucketKey: "esta_semana" },
  { label: "Mais adiante", urgencia: "mais", bucketKey: "mais_adiante" },
  { label: "Sem prazo", urgencia: "sem", bucketKey: "sem_prazo" },
];

// ─── filtros server-side ─────────────────────────────────────────────────────

interface FiltrosAtivos {
  search: string;
  type: string;
  user_status: string;
  court: string;
  urgencia: string;
}

const FILTROS_VAZIOS: FiltrosAtivos = {
  search: "",
  type: "",
  user_status: "PENDING", // padrão: mostra pendentes
  court: "",
  urgencia: "",
};

// Mapeamento das visões rápidas para o param `urgencia` do BE.
const VISAO_URGENCIA: Record<string, string> = {
  atraso: "atraso",
  hoje: "hoje",
  semana: "semana",
  mais_adiante: "mais_adiante",
  nao_confirmado: "nao_confirmado",
};

export function IntimacoesView() {
  const [filtros, setFiltros] = useState<FiltrosAtivos>(FILTROS_VAZIOS);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const filters: IntimacoesFilters = {
    type: filtros.type || undefined,
    user_status: filtros.user_status || undefined,
    court: filtros.court || undefined,
    urgencia: filtros.urgencia || undefined,
  };

  const {
    intimacoes,
    filters: filterOptions,
    buckets,
    totalCount,
    isPending,
    isFetching,
    error,
    setSearch,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useIntimacoes(filters);

  const summary = useIntimacoesSummary();

  // Busca local debounce já feita no hook, mas também repassa para o server-side
  // sincronizando o estado de busca com o filtro externo.
  const handleSearch = (q: string) => {
    setSearch(q);
    setFiltros((f) => ({ ...f, search: q }));
  };

  const setFiltro = (key: keyof FiltrosAtivos, val: string) =>
    setFiltros((f) => ({ ...f, [key]: val }));

  const limpar = () => {
    setFiltros(FILTROS_VAZIOS);
    setSearch("");
  };

  // Agrupar por urgência da view (client-side apenas para organizar a lista já filtrada).
  // A contagem exibida no header vem dos `buckets` do BE (contagem REAL), não de
  // g.itens.length (que é limitado pelo page_size). Mostramos a seção sempre que o
  // bucket real > 0 ou há itens carregados — evita sumir seção com contagem positiva.
  const grupos = GRUPOS.map((g) => ({
    ...g,
    itens: intimacoes.filter((i) => urgenciaView(i.prazo) === g.urgencia),
    count: buckets[g.bucketKey],
  })).filter((g) => g.count > 0 || g.itens.length > 0);

  const atual =
    intimacoes.find((i) => i.id === selecionada) ?? intimacoes[0] ?? null;

  if (isPending) return <Esqueleto />;

  // Falha de fetch NÃO pode parecer inbox vazia: mostra o erro (espelha o detalhe).
  if (error)
    return (
      <div className="px-8 pt-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as intimações. Tente novamente.
        </p>
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-8 pt-6">
        <PageHeader
          titulo="Intimações"
          descricao="O que chegou do DJEN e o que precisa ser feito antes do prazo."
        >
          {/* Barra de filtros server-side */}
          <BarraFiltros
            filtros={filtros}
            filterOptions={filterOptions}
            onSearch={handleSearch}
            onFiltro={setFiltro}
            onLimpar={limpar}
            isFetching={isFetching}
          />

          {/* 4 KPIs do summary real */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <Kpi
              rotulo="Em atraso"
              valor={summary.data?.em_atraso ?? 0}
              tom="danger"
              icone={<AlarmClock className="size-4" />}
            />
            <Kpi
              rotulo="Vencem hoje"
              valor={summary.data?.vencem_hoje ?? 0}
              tom="warning"
              icone={<Clock className="size-4" />}
            />
            <Kpi
              rotulo="Prazo não confirmado"
              valor={summary.data?.nao_confirmado ?? 0}
              tom="info"
              icone={<Scale className="size-4" />}
            />
            <Kpi
              rotulo="Abertas"
              valor={summary.data?.pendentes ?? 0}
              icone={<Inbox className="size-4" />}
            />
          </div>
        </PageHeader>
      </div>

      {/* Vista triagem: lista + painel lateral */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(340px,430px)]">
        <ListaAgrupada
          grupos={grupos}
          totalFiltrado={intimacoes.length}
          selecionada={atual?.id}
          onSelecionar={setSelecionada}
          onLimpar={limpar}
          isFetching={isFetching}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageNumber={pageNumber}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          totalCount={totalCount}
        />
        {atual && <PainelLateral item={atual} />}
      </div>
    </div>
  );
}

// ─── barra de filtros ─────────────────────────────────────────────────────────

function BarraFiltros({
  filtros,
  filterOptions,
  onSearch,
  onFiltro,
  onLimpar,
  isFetching,
}: {
  filtros: FiltrosAtivos;
  filterOptions: Record<string, { label: string; value: string }[] | undefined>;
  onSearch: (q: string) => void;
  onFiltro: (k: keyof FiltrosAtivos, v: string) => void;
  onLimpar: () => void;
  isFetching: boolean;
}) {
  const visoes = [
    { chave: "atraso", label: "Em atraso" },
    { chave: "hoje", label: "Vencem hoje" },
  ];

  const visaoAtiva = filtros.urgencia
    ? (Object.entries(VISAO_URGENCIA).find(
        ([, v]) => v === filtros.urgencia,
      )?.[0] ?? null)
    : null;

  const toggleVisao = (chave: string) => {
    const urgParam = VISAO_URGENCIA[chave] ?? "";
    onFiltro("urgencia", filtros.urgencia === urgParam ? "" : urgParam);
  };

  const typeOpcoes: { valor: string; label: string }[] = [
    { valor: "__todos__", label: "Todos os tipos" },
    ...(
      filterOptions["type"] ??
      Object.entries(TYPE_LABEL).map(([v, l]) => ({ label: l, value: v }))
    ).map((o: { value: string; label: string }) => ({
      valor: o.value,
      label: o.label,
    })),
  ];

  const userStatusOpcoes: { valor: string; label: string }[] = [
    { valor: "__todos__", label: "Todos" },
    ...(
      filterOptions["user_status"] ??
      Object.entries(USER_STATUS_LABEL).map(([v, l]) => ({
        label: l,
        value: v,
      }))
    ).map((o: { value: string; label: string }) => ({
      valor: o.value,
      label: o.label,
    })),
  ];

  const courtOpcoes: { valor: string; label: string }[] = [
    { valor: "__todos__", label: "Todos os tribunais" },
    ...(filterOptions["court"] ?? []).map(
      (o: { value: string; label: string }) => ({
        valor: o.value,
        label: o.label,
      }),
    ),
  ];

  // Mapas value→label para o <SelectValue/> renderizar o rótulo (não o código).
  const typeItems = Object.fromEntries(
    typeOpcoes.map((o) => [o.valor, o.label]),
  );
  const userStatusItems = Object.fromEntries(
    userStatusOpcoes.map((o) => [o.valor, o.label]),
  );
  const courtItems = Object.fromEntries(
    courtOpcoes.map((o) => [o.valor, o.label]),
  );

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      <input
        type="search"
        placeholder="Buscar por nº do processo…"
        value={filtros.search}
        onChange={(e) => onSearch(e.target.value)}
        className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring h-8 w-[280px] rounded-md border px-3 text-[13px] focus:ring-1 focus:outline-none"
      />

      {/* Visões rápidas → urgencia param */}
      {visoes.map((v) => {
        const on = visaoAtiva === v.chave;
        return (
          <button
            key={v.chave}
            type="button"
            onClick={() => toggleVisao(v.chave)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              on
                ? "text-primary border-[color-mix(in_oklch,var(--primary)_40%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]"
                : "border-border bg-card text-muted-foreground hover:border-[color-mix(in_oklch,var(--primary)_40%,transparent)]",
            )}
          >
            {v.label}
          </button>
        );
      })}

      {/* Tipo */}
      <Select
        items={typeItems}
        value={filtros.type || "__todos__"}
        onValueChange={(v) =>
          onFiltro("type", v === "__todos__" || v == null ? "" : v)
        }
      >
        <SelectTrigger
          className="h-8 text-[12.5px]"
          aria-label="Tipo de intimação"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeOpcoes.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Situação */}
      <Select
        items={userStatusItems}
        value={filtros.user_status || "__todos__"}
        onValueChange={(v) =>
          onFiltro("user_status", v === "__todos__" || v == null ? "" : v)
        }
      >
        <SelectTrigger className="h-8 text-[12.5px]" aria-label="Situação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {userStatusOpcoes.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tribunal (só se o BE retornar opções) */}
      {courtOpcoes.length > 1 && (
        <Select
          items={courtItems}
          value={filtros.court || "__todos__"}
          onValueChange={(v) =>
            onFiltro("court", v === "__todos__" || v == null ? "" : v)
          }
        >
          <SelectTrigger className="h-8 text-[12.5px]" aria-label="Tribunal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {courtOpcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isFetching && (
        <span className="text-muted-foreground text-[11.5px]">Carregando…</span>
      )}

      <button
        type="button"
        onClick={onLimpar}
        className="border-border bg-card text-muted-foreground hover:text-foreground ml-auto cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px]"
      >
        Limpar filtros
      </button>
    </div>
  );
}

// ─── lista agrupada ───────────────────────────────────────────────────────────

function ListaAgrupada({
  grupos,
  totalFiltrado,
  selecionada,
  onSelecionar,
  onLimpar,
  isFetching,
  pageSize,
  onPageSizeChange,
  pageNumber,
  canPrev,
  canNext,
  onPrev,
  onNext,
  totalCount,
}: {
  grupos: {
    label: string;
    urgencia: Urgencia;
    itens: IntimacaoView[];
    count: number;
  }[];
  totalFiltrado: number;
  selecionada?: string;
  onSelecionar: (id: string) => void;
  onLimpar: () => void;
  isFetching: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  totalCount: number;
}) {
  return (
    <div
      className="overflow-y-auto px-8 pt-4 pb-8"
      aria-live="polite"
      aria-busy={isFetching}
    >
      {totalFiltrado === 0 && !isFetching && (
        <div className="text-muted-foreground py-16 text-center">
          <p className="text-sm">Nenhuma intimação com os filtros aplicados.</p>
          <button
            type="button"
            onClick={onLimpar}
            className="border-border bg-card mt-3 cursor-pointer rounded-lg border px-3.5 py-1.5 text-[12.5px]"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {grupos.map((g) => (
        <section key={g.label} className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-display text-[15px] tracking-wide">
              {g.label}
            </span>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {g.count}
            </span>
            <span className="bg-border h-px flex-1" />
          </div>

          {g.itens.map((i) => {
            const u = urgenciaView(i.prazo);
            const itemCor = corDaUrgenciaView(u);
            const naoConfirmado =
              !!i.prazo && !i.prazo.confirmed && i.prazo.status === "PENDING";

            return (
              <button
                key={i.id}
                type="button"
                onClick={() => onSelecionar(i.id)}
                className={cn(
                  "border-border grid w-full grid-cols-[minmax(0,1fr)_128px] items-center gap-3 border-b py-3 pr-3 text-left",
                  "hover:bg-muted cursor-pointer border-l-[3px]",
                  i.id === selecionada && "bg-muted",
                )}
                style={{ borderLeftColor: itemCor }}
              >
                <span className="min-w-0 pl-3">
                  <span className="block text-[14.5px] tabular-nums">
                    {i.cnj_number}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-[11.5px]">
                    {TYPE_LABEL[i.type] ?? i.type} · {i.court}
                  </span>
                  <span className="text-muted-foreground mt-1 line-clamp-2 block text-[12.5px]">
                    {i.content_preview}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <Pilula>
                      {USER_STATUS_LABEL[i.user_status] ?? i.user_status}
                    </Pilula>
                    {naoConfirmado && (
                      <StatusBadge tone="warning" className="text-[10.5px]">
                        prazo não confirmado
                      </StatusBadge>
                    )}
                  </span>
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: itemCor }}
                >
                  <span className="block">{rotuloPrazoView(i.prazo)}</span>
                  {i.prazo?.end_date && (
                    <span className="text-muted-foreground block text-[11px]">
                      {formatarData(i.prazo.end_date)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </section>
      ))}

      {/* Paginação — discreta no rodapé, só aparece quando há mais de uma página */}
      {(canPrev || canNext) && (
        <ListPagination
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageNumber={pageNumber}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          totalCount={totalCount}
          className="border-border border-t pt-4"
        />
      )}
    </div>
  );
}

// ─── painel lateral ───────────────────────────────────────────────────────────

function PainelLateral({ item }: { item: IntimacaoView }) {
  const u = urgenciaView(item.prazo);
  const cor = corDaUrgenciaView(u);
  const naoConfirmado =
    !!item.prazo && !item.prazo.confirmed && item.prazo.status === "PENDING";

  return (
    <aside className="border-border overflow-y-auto border-l p-6">
      <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
        {TYPE_LABEL[item.type] ?? item.type} · {item.court}
      </p>
      <h2 className="font-display mt-2 text-[22px] leading-tight font-medium tabular-nums">
        {item.cnj_number}
      </h2>
      <p className="text-muted-foreground mt-1 text-xs">
        Publicado em {formatarData(item.published_at)}
      </p>

      {item.prazo ? (
        <div className="border-border my-4 flex items-baseline gap-3 border-y py-3">
          <span
            className="font-display text-[40px] leading-none tabular-nums"
            style={{ color: cor }}
          >
            {Math.abs(item.prazo.days_left)}
          </span>
          <span className="text-muted-foreground text-xs">
            {rotuloPrazoView(item.prazo)}
            <span className="block">
              {item.prazo.end_date ? formatarData(item.prazo.end_date) : "—"}
              {naoConfirmado && (
                <StatusBadge tone="warning" className="ml-2 text-[10.5px]">
                  não confirmado
                </StatusBadge>
              )}
            </span>
          </span>
        </div>
      ) : (
        <div className="border-border text-muted-foreground my-4 border-y py-3 text-sm">
          Sem prazo derivado
        </div>
      )}

      <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
        Prévia do teor
      </p>
      <p className="text-muted-foreground mt-2 mb-4 text-[13.5px] leading-relaxed text-pretty">
        {item.content_preview}
      </p>

      <Link
        href={`/intimacoes/${item.id}`}
        className="bg-primary text-primary-foreground mt-2 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-center text-[13.5px] font-medium no-underline hover:no-underline"
      >
        Abrir intimação
      </Link>
    </aside>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function Pilula({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border text-muted-foreground rounded-sm border px-1.5 py-px text-[10.5px] tracking-wide uppercase">
      {children}
    </span>
  );
}

function Esqueleto() {
  return (
    <div className="p-8">
      <div className="bg-muted h-9 w-64 animate-pulse rounded" />
      <div className="mt-6 grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="bg-muted mt-6 h-64 animate-pulse rounded-xl" />
    </div>
  );
}
