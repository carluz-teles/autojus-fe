"use client";

import { AlarmClock, Clock, History, Inbox, Scale } from "lucide-react";
import Link from "next/link";

import { Avatar, Kpi } from "@/components/mock-ui/data-display";
import { Card, PageHeader } from "@/components/mock-ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useIntimacoes,
  useIntimacoesSummary,
} from "@/features/intimacoes/hooks/use-intimacoes";
import type {
  IntimacaoView,
  IntimacoesBuckets,
} from "@/features/intimacoes/types";
import { useProcessosSummary } from "@/features/processos/hooks/use-processos";
import {
  corDaUrgencia,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { formatarData } from "@/lib/utils";

// Buckets exibidos em "Próximos prazos" — as mesmas 6 faixas das tabs de
// urgência de IntimacoesView (mais_adiante fica de fora, mesmo critério).
// `buckets` vem do envelope da lista de intimações e independe do filtro
// `urgencia` ativo (ver IntimacoesBuckets em features/intimacoes/types.ts).
const PROXIMOS_PRAZOS_BUCKETS: {
  label: string;
  key: keyof IntimacoesBuckets;
}[] = [
  { label: "Atrasado", key: "atraso" },
  { label: "Hoje", key: "hoje" },
  { label: "Próximos 2 dias", key: "proximos_dois_dias" },
  { label: "Esta semana", key: "esta_semana" },
  { label: "Este mês", key: "este_mes" },
  { label: "Sem data definida", key: "sem_data_definida" },
];

export function DashboardView() {
  const intimacoesSummary = useIntimacoesSummary();
  const processosSummary = useProcessosSummary();

  // "Precisa de você hoje" — as duas abas mais urgentes do inbox de intimações
  // (mesmo par de filtros de IntimacoesView), mescladas e ordenadas por
  // days_left. `buckets` é igual nas duas chamadas (independe de `urgencia`),
  // então "Próximos prazos" reaproveita a da primeira sem um 3º fetch.
  const emAtraso = useIntimacoes({ urgencia: "atraso" });
  const venceHoje = useIntimacoes({ urgencia: "hoje" });

  const urgentes = [...emAtraso.intimacoes, ...venceHoje.intimacoes].sort(
    (a, b) => (a.prazo?.days_left ?? 0) - (b.prazo?.days_left ?? 0),
  );

  const buckets = emAtraso.buckets;

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Dashboard"
        descricao="O que exige providência hoje, e como o escritório está andando."
      />

      <section className="mt-6 grid grid-cols-4 gap-4">
        <Kpi
          rotulo="Prazos em atraso"
          valor={intimacoesSummary.data?.em_atraso ?? 0}
          tom="danger"
          dica="exige providência hoje"
          icone={<AlarmClock className="size-4" />}
        />
        <Kpi
          rotulo="Vencem hoje"
          valor={intimacoesSummary.data?.vencem_hoje ?? 0}
          tom="warning"
          dica="dias úteis"
          icone={<Clock className="size-4" />}
        />
        <Kpi
          rotulo="Prazo não confirmado"
          valor={intimacoesSummary.data?.nao_confirmado ?? 0}
          tom="info"
          dica="aguardando decisão humana"
          icone={<Inbox className="size-4" />}
        />
        <Kpi
          rotulo="Processos monitorados"
          valor={processosSummary.data?.total ?? 0}
          dica="total do acervo"
          icone={<Scale className="size-4" />}
        />
      </section>

      <section className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <Card className="p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[19px] font-medium">
              Precisa de você hoje
            </h2>
            <Link href="/intimacoes" className="text-[12.5px]">
              Ver todas
            </Link>
          </div>
          <div className="mt-4">
            {urgentes.map((i) => (
              <LinhaUrgente key={i.id} intimacao={i} />
            ))}
            {urgentes.length === 0 && (
              <p className="border-border text-muted-foreground border-t py-4 text-sm">
                Nada vence nas próximas 48 horas.
              </p>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="font-display mb-3 text-[17px] font-medium">
            Próximos prazos
          </h2>
          {PROXIMOS_PRAZOS_BUCKETS.map((b) => (
            <div
              key={b.key}
              className="border-border flex items-baseline justify-between gap-3 border-t py-2.5"
            >
              <span className="text-[13px]">{b.label}</span>
              <span className="text-muted-foreground text-[13px] tabular-nums">
                {buckets[b.key]} prazo(s)
              </span>
            </div>
          ))}
        </Card>
      </section>

      <Card className="mt-4 p-6">
        <h2 className="font-display mb-3 text-[19px] font-medium">
          Atividade recente
        </h2>
        <EmptyState
          icon={History}
          title="Feed de atividade"
          description="O histórico de ações do escritório ainda não está disponível."
          phase="Em breve"
        />
      </Card>
    </div>
  );
}

/** Uma linha do card "Precisa de você hoje" — cor/rótulo de urgência derivados
 * de prazo.days_left (já calculado pelo BE), mesma paleta de corDaUrgencia
 * usada nas telas de Processos/Peças/Tarefas (features/shared/prazo). */
function LinhaUrgente({ intimacao: i }: { intimacao: IntimacaoView }) {
  const dias = i.prazo?.days_left ?? null;
  const urgencia = urgenciaDe(dias);
  const nomeResponsavel = i.assignee_user_name?.trim() || "Sem responsável";

  return (
    <Link
      href={`/intimacoes/${i.id}`}
      className="border-border hover:bg-muted grid grid-cols-[minmax(0,1fr)_132px_120px] items-center gap-4 border-t border-l-[3px] px-3 py-3.5 no-underline hover:no-underline"
      style={{ borderLeftColor: corDaUrgencia(urgencia) }}
    >
      <span className="min-w-0">
        <span className="text-foreground block text-sm font-medium">
          {i.title}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[11.5px] tabular-nums">
          {i.cnj_number}
        </span>
      </span>
      <span
        className="text-[12.5px] tabular-nums"
        style={{ color: corDaUrgencia(urgencia) }}
      >
        {rotuloPrazo(dias)}
        <span className="text-muted-foreground block text-[11px]">
          {i.prazo?.end_date ? formatarData(i.prazo.end_date) : "—"}
        </span>
      </span>
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Avatar nome={nomeResponsavel} />
        {nomeResponsavel.split(" ")[0]}
      </span>
    </Link>
  );
}
