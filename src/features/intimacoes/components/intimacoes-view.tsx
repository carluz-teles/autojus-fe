"use client";

import { Menu } from "@base-ui/react/menu";
import { Building2, Check, CircleCheck, User, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/mock-ui/layout";
import { Checkbox } from "@/components/ui/checkbox";
import { type Facet, FacetedFilter } from "@/components/ui/faceted-filter";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { cn, formatarData } from "@/lib/utils";

import {
  type IntimacoesFilters,
  useBulkAssignResponsavel,
  useIntimacaoDetalhe,
  useIntimacoes,
} from "../hooks/use-intimacoes";
import { TYPE_LABEL, USER_STATUS_LABEL } from "../lib/labels";
import { tituloIntimacao } from "../lib/titulo";
import type {
  IntimacaoPrazoView,
  IntimacaoView,
  IntimacoesBuckets,
} from "../types";
import { AnalisarCard } from "./shared/analisar-card";
import {
  AtribuirResponsavel,
  nomeExibicao,
} from "./shared/atribuir-responsavel";
import { Avatar, initials } from "./shared/avatar";
import { PartesInline } from "./shared/partes-inline";
import { PrazoContagemGrande } from "./shared/prazo-contagem-grande";
import { corUrgencia, prazoUrgenciaInfo } from "./shared/prazo-urgencia";
import { TeorPublicacao } from "./shared/teor-publicacao";

// ─────────────────────────────────────────────────────────────────────────────
// IntimacoesView — inbox de triagem em layout master-detail: lista (~60%) +
// painel de detalhe compacto (~40%, sticky), seguindo os 2 prints do design.
// As 5 tabs de urgência disparam fetch REAL via ?urgencia; o toggle Triagem/
// Prazos só reordena o MESMO dataset já carregado (client-side, sem novo
// fetch). O painel de detalhe busca a intimação selecionada por completo
// (useIntimacaoDetalhe) e REUSA o <AnalisarCard/> da tela de detalhe — os 2
// estados dos prints (com/sem análise) são o mesmo componente, sem duplicar.
// ─────────────────────────────────────────────────────────────────────────────

/** Tabs de urgência: rótulo, valor de wire (?urgencia) e a chave do bucket que
 * traz a contagem real. O valor de wire de "Esta semana" é "semana" — só o
 * NOME do campo no envelope `buckets` é "esta_semana" (ver types.ts). São seis
 * tabs; mais_adiante fica de fora do master-detail (calculado mas não é tab). */
const URGENCIA_TABS: {
  value: string;
  label: string;
  bucketKey: keyof IntimacoesBuckets;
}[] = [
  { value: "atraso", label: "Em atraso", bucketKey: "atraso" },
  { value: "hoje", label: "Vence hoje", bucketKey: "hoje" },
  {
    value: "proximos_dois_dias",
    label: "Próximos dois dias",
    bucketKey: "proximos_dois_dias",
  },
  { value: "semana", label: "Esta semana", bucketKey: "esta_semana" },
  { value: "este_mes", label: "Este mês", bucketKey: "este_mes" },
  {
    value: "sem_data_definida",
    label: "Sem data definida",
    bucketKey: "sem_data_definida",
  },
];

type ModoVisao = "triagem" | "prazos";

/** Rótulo curto do prazo pra coluna direita da linha da lista — wording do design
 * (rotuloPrazo): "N dias em atraso" · "vence hoje" · "vence amanhã" · "em N dias". */
function rotuloPrazo(prazo: IntimacaoPrazoView | null): string {
  const info = prazoUrgenciaInfo(prazo);
  if (!info) return "sem prazo";
  if (info.atrasado)
    return `${info.magnitude} ${info.magnitude === 1 ? "dia" : "dias"} em atraso`;
  if (info.hoje) return "vence hoje";
  if (info.magnitude === 1) return "vence amanhã";
  return `em ${info.magnitude} dias`;
}

/**
 * Reordena o MESMO array carregado — Triagem prioriza o que ainda precisa de
 * análise (ai_analyzed_at null primeiro), depois o prazo mais urgente; Prazos
 * ordena estritamente pela proximidade do vencimento (days_left), prazo nulo
 * por último. Puro client-side — nenhum novo fetch ao trocar o toggle.
 */
function ordenarPorModo(
  itens: IntimacaoView[],
  modo: ModoVisao,
): IntimacaoView[] {
  const copia = [...itens];
  if (modo === "prazos") {
    copia.sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return a.prazo.days_left - b.prazo.days_left;
    });
    return copia;
  }
  copia.sort((a, b) => {
    const aAnalisada = !!a.ai_analyzed_at;
    const bAnalisada = !!b.ai_analyzed_at;
    if (aAnalisada !== bAnalisada) return aAnalisada ? 1 : -1;
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.days_left - b.prazo.days_left;
  });
  return copia;
}

interface FiltrosExtra {
  type: string;
  user_status: string;
  court: string;
  /** id do membro (assignee) — filtra por condutor OU revisor. */
  responsavel: string;
}

const FILTROS_EXTRA_VAZIOS: FiltrosExtra = {
  type: "",
  user_status: "",
  court: "",
  responsavel: "",
};

export function IntimacoesView() {
  const [urgencia, setUrgencia] = useState<string>("atraso");
  // Chip "Não confirmadas" (triagem) — filtro server-side, estado em memória (sem URL).
  // Persiste ao trocar de tab porque é um estado independente de `urgencia`.
  const [naoConfirmadas, setNaoConfirmadas] = useState(false);
  const [filtrosExtra, setFiltrosExtra] =
    useState<FiltrosExtra>(FILTROS_EXTRA_VAZIOS);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  // Seleção em massa. Dois modos: `todosDaFaixa` (ALL — toda a faixa, inclusive os
  // itens ainda NÃO carregados; a ação manda um flag, não ids) OU `marcadas` (ids
  // individuais). Escopo por faixa: limpa ao trocar de tab (via trocarUrgencia).
  const [todosDaFaixa, setTodosDaFaixa] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  const trocarUrgencia = (valor: string) => {
    setUrgencia(valor);
    setTodosDaFaixa(false);
    setMarcadas(new Set());
  };

  const membros = useOrgMembersDirectory();

  const filters: IntimacoesFilters = {
    urgencia,
    naoConfirmado: naoConfirmadas || undefined,
    assignee: filtrosExtra.responsavel || undefined,
    type: filtrosExtra.type || undefined,
    user_status: filtrosExtra.user_status || undefined,
    court: filtrosExtra.court || undefined,
  };

  const {
    intimacoes,
    filters: filterOptions,
    buckets,
    totalCount,
    isPending,
    isFetching,
    error,
    search,
    setSearch,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useIntimacoes(filters);

  const intimacoesOrdenadas = useMemo(
    () => ordenarPorModo(intimacoes, "triagem"),
    [intimacoes],
  );

  // Seleciona o primeiro item por padrão (ou quando a seleção atual sai do
  // dataset carregado — troca de tab/filtro). Nunca sobrescreve uma seleção
  // ainda presente na lista. Ajuste síncrono no render (mesmo padrão de
  // useCursorPagination) — evita o cascading render de um setState em efeito.
  const selecaoValida = intimacoesOrdenadas.some((i) => i.id === selecionadaId);
  if (!isPending && !selecaoValida) {
    const proxima = intimacoesOrdenadas[0]?.id ?? null;
    if (proxima !== selecionadaId) setSelecionadaId(proxima);
  }

  const naoAnalisadasNaFaixa = intimacoes.filter(
    (i) => !i.ai_analyzed_at,
  ).length;

  // Seleção em massa.
  const idsCarregados = intimacoesOrdenadas.map((i) => i.id);
  const todasMarcadas =
    todosDaFaixa ||
    (idsCarregados.length > 0 && idsCarregados.every((id) => marcadas.has(id)));
  const alguma = todosDaFaixa || marcadas.size > 0;
  const qtdSelecionada = todosDaFaixa ? totalCount : marcadas.size;
  const estaMarcada = (id: string) => todosDaFaixa || marcadas.has(id);

  const limparSelecao = () => {
    setTodosDaFaixa(false);
    setMarcadas(new Set());
  };
  // Master: liga o modo ALL (toda a faixa); desliga tudo se já estava tudo marcado.
  const alternarTodas = () => {
    setMarcadas(new Set());
    setTodosDaFaixa(!todasMarcadas);
  };
  const alternarMarcada = (id: string) => {
    if (todosDaFaixa) {
      // Sai do modo ALL materializando os carregados menos o desmarcado.
      const next = new Set(idsCarregados);
      next.delete(id);
      setTodosDaFaixa(false);
      setMarcadas(next);
      return;
    }
    setMarcadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAssign = useBulkAssignResponsavel();
  const atribuirEmMassa = (assigneeUserId: string) => {
    bulkAssign.mutate(
      {
        assigneeUserId,
        all: todosDaFaixa,
        ids: todosDaFaixa ? [] : [...marcadas],
        // filtros da faixa atual (usados só no modo ALL).
        urgencia,
        nao_confirmado: naoConfirmadas,
        search,
        type: filtrosExtra.type,
        user_status: filtrosExtra.user_status,
        court: filtrosExtra.court,
        assignee: filtrosExtra.responsavel,
      },
      {
        onSuccess: (r) => {
          toast(
            `${r.affected} ${r.affected === 1 ? "intimação atribuída" : "intimações atribuídas"}`,
          );
          limparSelecao();
        },
      },
    );
  };

  const limparFiltrosExtra = () => setFiltrosExtra(FILTROS_EXTRA_VAZIOS);

  const facetas: Facet[] = useMemo(() => {
    // O filterOptions do BE devolve o ENUM cru como label ("PENDING"); mapeamos
    // pelo dicionário pt-BR pra não vazar código na UI. Fallback = chaves do dict.
    const rotular = (
      opcoes: { value: string; label: string }[] | undefined,
      dict: Record<string, string>,
    ) => {
      const base =
        opcoes && opcoes.length > 0
          ? opcoes
          : Object.keys(dict).map((value) => ({ value, label: value }));
      return base.map((o) => ({
        value: o.value,
        label: dict[o.value] ?? o.label,
      }));
    };

    // Ordem + ícones do design (Claude Design): Responsável, Status, Tribunal.
    // Etapa do peticionamento / Órgão julgador / Classe do protótipo dependem de
    // facetas que o BE ainda não expõe — não dá pra inventar opção em filtro real.
    const fs: Facet[] = [];
    if (membros.members.length > 0) {
      fs.push({
        key: "responsavel",
        label: "Responsável",
        icon: User,
        options: membros.members.map((m) => ({
          value: m.id,
          label: nomeExibicao(m.name, m.email),
        })),
      });
    }
    fs.push({
      key: "user_status",
      label: "Status",
      icon: CircleCheck,
      options: rotular(filterOptions["user_status"], USER_STATUS_LABEL),
    });
    const courts = filterOptions["court"] ?? [];
    if (courts.length > 0) {
      fs.push({
        key: "court",
        label: "Tribunal",
        icon: Building2,
        options: courts,
      });
    }
    return fs;
  }, [filterOptions, membros.members]);

  if (isPending) return <Esqueleto />;

  // Falha de fetch NÃO pode parecer inbox vazia: mostra o erro.
  if (error)
    return (
      <div className="px-8 pt-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as intimações. Tente novamente.
        </p>
      </div>
    );

  return (
    <div className="relative -mx-6 -my-10 flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-5">
        <PageHeader
          titulo="Intimações"
          descricao="O que chegou do DJEN e o que precisa ser feito antes do prazo."
          className="border-b-0 pb-0"
        >
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ListSearchToolbar
              className="flex-1"
              inputWidthClassName="sm:max-w-sm"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por processo, classe ou órgão…"
            >
              {isFetching ? (
                <span className="text-muted-foreground text-[11.5px]">
                  Carregando…
                </span>
              ) : null}
            </ListSearchToolbar>

            <FacetedFilter
              className="ml-auto"
              facets={facetas}
              values={{
                user_status: filtrosExtra.user_status,
                type: filtrosExtra.type,
                court: filtrosExtra.court,
                responsavel: filtrosExtra.responsavel,
              }}
              onChange={(key, value) =>
                setFiltrosExtra((f) => ({ ...f, [key]: value }))
              }
              onClear={limparFiltrosExtra}
            />
          </div>
        </PageHeader>
      </div>

      {/* Master-detail: coluna esquerda (tabs + seleção + lista) | painel de detalhe.
          Larguras EXATAS do protótipo (Claude Design): lista minmax(420px,1fr), painel
          capado em minmax(340px,430px) — a lista absorve o resto; o painel não estica.
          A linha horizontal (border-t) separa o bloco de cima (título/busca) do
          conjunto abaixo; o painel de detalhe começa na mesma altura da tab bar. */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(340px,430px)] border-t">
        <div className="flex min-h-0 flex-col">
          <div className="px-8 pt-4">
            <div
              role="tablist"
              aria-label="Urgência"
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const tabs = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  ),
                );
                const current = tabs.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (current === -1) return;
                e.preventDefault();
                const delta = e.key === "ArrowRight" ? 1 : -1;
                const next =
                  tabs[(current + delta + tabs.length) % tabs.length];
                next.focus();
                next.click();
              }}
              className="flex items-center border-b"
            >
              {URGENCIA_TABS.map((t) => {
                const selected = urgencia === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => trocarUrgencia(t.value)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 border-b-2 px-4 pb-3 text-[13px] transition-colors",
                      selected
                        ? "border-primary text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground border-transparent font-medium",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-2 text-xs tabular-nums",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {buckets[t.bucketKey]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Chip "Não confirmadas" — toggle de triagem server-side, combina com
                qualquer tab temporal. Estado em memória (sem URL), persiste ao trocar
                de tab. Checkbox real + label para acessibilidade por teclado. */}
            <div className="mt-3">
              <Tooltip label="Triagem só se aplica a prazos sugeridos">
                <label
                  htmlFor="filtro-nao-confirmadas"
                  className="text-muted-foreground flex w-fit cursor-pointer items-center gap-2 text-[12.5px]"
                >
                  <Checkbox
                    id="filtro-nao-confirmadas"
                    checked={naoConfirmadas}
                    onCheckedChange={(v) => setNaoConfirmadas(Boolean(v))}
                  />
                  Não confirmadas
                </label>
              </Tooltip>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-[12.5px]">
                <Checkbox
                  checked={todasMarcadas}
                  indeterminate={alguma && !todasMarcadas}
                  onCheckedChange={() => alternarTodas()}
                  aria-label="Selecionar todas nesta faixa"
                />
                Selecionar {totalCount} nesta faixa
              </label>
              <StatusBadge
                label={`${naoAnalisadasNaFaixa} não analisadas`}
                tone="warning"
                dot={false}
                className="bg-gold/20 text-gold border-transparent"
              />
            </div>
          </div>

          <ListaIntimacoes
            itens={intimacoesOrdenadas}
            totalCount={totalCount}
            selecionadaId={selecionadaId}
            onSelecionar={setSelecionadaId}
            estaMarcada={estaMarcada}
            onMarcar={alternarMarcada}
            onLimpar={() => {
              limparFiltrosExtra();
              setSearch("");
            }}
            isFetching={isFetching}
            hasMore={!!hasMore}
            isLoadingMore={isLoadingMore}
            onMostrarMais={() => void loadMore()}
          />
        </div>
        {selecionadaId ? (
          <PainelDetalhe id={selecionadaId} />
        ) : (
          <aside className="border-border text-muted-foreground overflow-y-auto border-l p-6 text-sm">
            Nenhuma intimação selecionada.
          </aside>
        )}
      </div>

      {alguma ? (
        <BarraSelecao
          quantidade={qtdSelecionada}
          membros={membros.members}
          atribuindo={bulkAssign.isPending}
          onAtribuir={atribuirEmMassa}
          onFechar={limparSelecao}
        />
      ) : null}
    </div>
  );
}

// Barra flutuante de ações em massa — aparece quando há intimações marcadas. Por
// ora só "Atribuir": abre um menu com os membros e atribui o condutor a toda a
// seleção (modo ALL manda flag+filtros; individual manda ids).
function BarraSelecao({
  quantidade,
  membros,
  atribuindo,
  onAtribuir,
  onFechar,
}: {
  quantidade: number;
  membros: { id: string; name: string; email: string }[];
  atribuindo: boolean;
  onAtribuir: (conductorUserId: string) => void;
  onFechar: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[40%] left-0 z-40 flex items-end justify-center pb-6">
      <div className="bg-foreground text-background pointer-events-auto flex items-center gap-1.5 rounded-2xl p-1.5 pl-4 shadow-xl">
        <span className="pr-2 text-[13px] leading-tight font-medium">
          {quantidade} {quantidade === 1 ? "selecionada" : "selecionadas"}
        </span>
        <Menu.Root>
          <Menu.Trigger
            disabled={atribuindo}
            className="bg-gold text-foreground hover:bg-gold/90 flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            <UserPlus className="size-4" />
            {atribuindo ? "Atribuindo…" : "Atribuir"}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="top" align="center" sideOffset={8}>
              <Menu.Popup className="bg-popover text-popover-foreground ring-foreground/10 z-50 max-h-72 min-w-52 overflow-y-auto rounded-lg p-1 shadow-md ring-1 outline-none">
                {membros.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-[13px]">
                    Nenhum membro disponível.
                  </p>
                ) : (
                  membros.map((m) => {
                    const nome = nomeExibicao(m.name, m.email);
                    return (
                      <Menu.Item
                        key={m.id}
                        onClick={() => onAtribuir(m.id)}
                        className="focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none select-none"
                      >
                        <Avatar size="sm" initials={initials(nome)} />
                        <span className="flex-1 truncate">{nome}</span>
                      </Menu.Item>
                    );
                  })
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Limpar seleção"
          className="hover:bg-background/10 ml-1 flex size-8 items-center justify-center rounded-xl transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── lista (coluna esquerda) ────────────────────────────────────────────────

function ListaIntimacoes({
  itens,
  totalCount,
  selecionadaId,
  onSelecionar,
  estaMarcada,
  onMarcar,
  onLimpar,
  isFetching,
  hasMore,
  isLoadingMore,
  onMostrarMais,
}: {
  itens: IntimacaoView[];
  totalCount: number;
  selecionadaId: string | null;
  onSelecionar: (id: string) => void;
  estaMarcada: (id: string) => boolean;
  onMarcar: (id: string) => void;
  onLimpar: () => void;
  isFetching: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onMostrarMais: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-8 pt-4"
        aria-live="polite"
        aria-busy={isFetching}
      >
        {itens.length === 0 && !isFetching ? (
          <div className="text-muted-foreground py-16 text-center">
            <p className="text-sm">Nenhuma intimação nesta faixa.</p>
            <button
              type="button"
              onClick={onLimpar}
              className="border-border bg-card mt-3 cursor-pointer rounded-lg border px-3.5 py-1.5 text-[12.5px]"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}

        {itens.map((item) => (
          <LinhaIntimacao
            key={item.id}
            item={item}
            selecionada={item.id === selecionadaId}
            onSelecionar={() => onSelecionar(item.id)}
            marcada={estaMarcada(item.id)}
            onMarcar={() => onMarcar(item.id)}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="border-border shrink-0 border-t px-8 py-3">
          <button
            type="button"
            onClick={onMostrarMais}
            disabled={isLoadingMore}
            className="text-primary cursor-pointer text-[12.5px] font-medium hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore
              ? "Carregando…"
              : `Mostrar mais ${Math.max(totalCount - itens.length, 0)} de ${totalCount}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LinhaIntimacao({
  item,
  selecionada,
  onSelecionar,
  marcada,
  onMarcar,
}: {
  item: IntimacaoView;
  selecionada: boolean;
  onSelecionar: () => void;
  marcada: boolean;
  onMarcar: () => void;
}) {
  const cor = corUrgencia(item.prazo);
  const analisada = !!item.ai_analyzed_at;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelecionar}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelecionar();
        }
      }}
      style={{ borderLeftColor: cor }}
      className={cn(
        "border-border grid w-full grid-cols-[22px_minmax(0,1fr)_118px_88px] items-center gap-2.5 border-b border-l-[3px] py-2.5 pr-3 pl-[9px] text-left transition-colors",
        "cursor-pointer",
        selecionada ? "bg-gold/[0.1]" : "hover:bg-gold/[0.08]",
      )}
    >
      {/* col 1 — seleção */}
      <span
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={marcada}
          onCheckedChange={() => onMarcar()}
          aria-label="Selecionar intimação"
        />
      </span>

      {/* col 2 — título + processo + tag de análise */}
      <span className="min-w-0">
        <span className="text-foreground block truncate text-[14px]">
          {tituloIntimacao(item)}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="text-muted-foreground truncate text-[11.5px] tabular-nums">
            {item.cnj_number}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-px text-[10.5px] whitespace-nowrap",
              analisada ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold",
            )}
          >
            {analisada ? "analisada" : "não analisada"}
          </span>
        </span>
      </span>

      {/* col 3 — prazo (cor = urgência) */}
      <span className="text-[12px] tabular-nums" style={{ color: cor }}>
        <span className="block">{rotuloPrazo(item.prazo)}</span>
        {item.prazo?.end_date ? (
          <span className="text-muted-foreground block text-[11px]">
            {formatarData(item.prazo.end_date)}
          </span>
        ) : null}
      </span>

      {/* col 4 — responsável */}
      <span className="flex min-w-0 items-center">
        <AtribuirResponsavel intimacao={item} />
      </span>
    </div>
  );
}

// ─── painel de detalhe (coluna direita, sticky) ────────────────────────────

function PainelDetalhe({ id }: { id: string }) {
  const { data: i, isPending, error } = useIntimacaoDetalhe(id);

  if (isPending) return <PainelEsqueleto />;

  if (error || !i) {
    return (
      <aside className="border-border overflow-y-auto border-l p-6">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar esta intimação. Tente novamente.
        </p>
      </aside>
    );
  }

  return (
    <aside className="border-border sticky top-0 flex max-h-full min-w-0 flex-col overflow-y-auto border-l p-6">
      {/* ── Eyebrow + título + CNJ ── */}
      <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
        {TYPE_LABEL[i.type] ?? i.type} · {i.court}
      </p>
      <h2 className="font-display mt-2 text-[26px] leading-tight font-medium text-pretty">
        {tituloIntimacao(i)}
      </h2>
      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
        {i.cnj_number}
      </p>

      {/* ── Bloco de prazo (border-y) ── */}
      <div className="border-border my-4 flex items-center justify-between gap-3 border-y py-3">
        <PrazoContagemGrande prazo={i.prazo} businessDaysSuffix />

        {/* R2: Selo read-only "✓ prazo confirmado" — só quando confirmed === true */}
        {i.prazo?.confirmed === true ? (
          <span
            role="status"
            aria-label="Prazo confirmado por humano"
            className="text-muted-foreground flex shrink-0 items-center gap-1 text-[12px]"
          >
            <Check className="size-3.5" strokeWidth={2.2} aria-hidden />
            prazo confirmado
          </span>
        ) : null}
      </div>

      {/* ── Ficha compacta: só Órgão, Partes e Valor. Classe/Assunto/Publicada já
          aparecem no kicker/título e na lista; o resto vive na intimação aberta. ── */}
      <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground text-[12.5px]">Órgão</dt>
        <dd className="text-foreground truncate text-right text-[13px]">
          {i.judging_body || "—"}
        </dd>

        <dt className="text-muted-foreground text-[12.5px]">Partes</dt>
        <dd className="text-foreground truncate text-right text-[13px]">
          {/* Autor × Réu numa linha — reusa o read model /processos/:id/partes
              já exposto pelo slice acquisition (mesma fonte do cockpit). */}
          <PartesInline courtRecordId={i.court_record_id} />
        </dd>

        <dt className="text-muted-foreground text-[12.5px]">Valor da causa</dt>
        <dd className="text-foreground truncate text-right text-[13px]">
          <span aria-label="não disponível">—</span>
        </dd>
      </dl>

      {/* ── Teor recolhível: "Ver teor da publicação ▸", expande sob demanda ── */}
      {i.content ? (
        <TeorPublicacao
          content={i.content}
          borderColor="gold"
          variant="disclosure"
        />
      ) : null}

      {/* ── AnalisarCard — exatamente como estava ── */}
      <div className="mt-6 min-w-0 flex-1">
        <AnalisarCard intimacao={i} />
      </div>

      {/* ── Ações — exatamente como estavam ── */}
      <div className="mt-6 flex items-center gap-2.5">
        <Link
          href={`/intimacoes/${i.id}`}
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-center text-[13.5px] font-medium no-underline hover:no-underline"
        >
          Abrir intimação
        </Link>
        <Link
          href={`/pecas/nova?intimation_id=${encodeURIComponent(i.id)}`}
          className="border-border hover:bg-muted/40 flex flex-1 items-center justify-center rounded-lg border px-4 py-2.5 text-center text-[13.5px] font-medium no-underline hover:no-underline"
        >
          Redigir peça
        </Link>
      </div>
    </aside>
  );
}

// ─── esqueletos ─────────────────────────────────────────────────────────────

function PainelEsqueleto() {
  return (
    <aside className="border-border overflow-y-auto border-l p-6">
      {/* Eyebrow + título + CNJ */}
      <div className="bg-muted h-3 w-32 animate-pulse rounded" />
      <div className="bg-muted mt-3 h-7 w-52 animate-pulse rounded" />
      <div className="bg-muted mt-2 h-3 w-40 animate-pulse rounded" />
      {/* Bloco de prazo */}
      <div className="bg-muted mt-6 h-12 animate-pulse rounded" />
      {/* Tabela de metadados */}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="contents">
            <div className="bg-muted h-3 w-16 animate-pulse rounded" />
            <div className="bg-muted ml-auto h-3 w-24 animate-pulse rounded" />
          </div>
        ))}
      </div>
      {/* Teor da publicação */}
      <div className="bg-muted mt-6 h-3 w-28 animate-pulse rounded" />
      <div className="bg-muted mt-3 h-24 animate-pulse rounded" />
      {/* AnalisarCard */}
      <div className="bg-muted mt-6 h-40 animate-pulse rounded-xl" />
    </aside>
  );
}

function Esqueleto() {
  return (
    <div className="p-8">
      <div className="bg-muted h-9 w-64 animate-pulse rounded" />
      <div className="bg-muted mt-6 h-10 w-full animate-pulse rounded-lg" />
      <div className="bg-muted mt-4 h-9 w-full animate-pulse rounded-lg" />
      <div className="mt-6 grid grid-cols-[minmax(420px,1fr)_minmax(340px,430px)] gap-6">
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
