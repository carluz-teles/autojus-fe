"use client";

import {
  Archive,
  Clock,
  FileText,
  Gavel,
  ListChecks,
  Scale,
  ScrollText,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type ChecklistItem,
  ChecklistProgress,
} from "@/components/ui/checklist-progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DetailBody,
  DetailHeader,
  DetailLayout,
} from "@/components/ui/detail-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { IAField, IAPanel } from "@/components/ui/ia-panel";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  intimacaoTone,
  prazoTone,
  StatusBadge,
} from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, TimelineItem } from "@/components/ui/timeline";

// Página de referência do Design System (Wave 0 LEXIA). Renderiza cada tijolo
// compartilhado com dados de exemplo pra revisão visual. NÃO é tela de produto:
// vive fora do grupo (app) — sem gate de onboarding. Dados hardcoded de propósito.

interface DemoRow {
  id: string;
  numero: string;
  tribunal: string;
  status: string;
  prazo: string;
}

const DEMO_ROWS: DemoRow[] = [
  {
    id: "1",
    numero: "5001234-56.2024.8.26.0100",
    tribunal: "TJSP · 1º grau",
    status: "Pendente",
    prazo: "3 dias",
  },
  {
    id: "2",
    numero: "0009876-54.2023.8.26.0053",
    tribunal: "TJSP · 2º grau",
    status: "Em análise",
    prazo: "12 dias",
  },
  {
    id: "3",
    numero: "1002345-67.2025.8.26.0224",
    tribunal: "TJSP · 1º grau",
    status: "Resolvida",
    prazo: "—",
  },
  {
    id: "4",
    numero: "3005678-90.2024.8.26.0011",
    tribunal: "TJSP · 1º grau",
    status: "Crítica",
    prazo: "Vencido",
  },
];

const DEMO_COLUMNS: DataTableColumn<DemoRow>[] = [
  {
    key: "numero",
    header: "Nº do processo",
    cell: (r) => <span className="font-medium tabular-nums">{r.numero}</span>,
  },
  {
    key: "tribunal",
    header: "Tribunal / grau",
    cell: (r) => <span className="text-muted-foreground">{r.tribunal}</span>,
  },
  {
    key: "status",
    header: "Situação",
    cell: (r) => (
      <StatusBadge label={r.status} tone={intimacaoTone(r.status)} />
    ),
  },
  {
    key: "prazo",
    header: "Prazo",
    align: "right",
    cell: (r) => <span className="tabular-nums">{r.prazo}</span>,
  },
];

const DEMO_CHECKLIST: ChecklistItem[] = [
  { id: "a", label: "Ciência da intimação", done: true, date: "05/08/2026" },
  { id: "b", label: "Análise da providência", done: true, date: "07/08/2026" },
  { id: "c", label: "Minuta da petição", done: false },
  { id: "d", label: "Protocolo", done: false },
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="reveal flex flex-col gap-4 border-t pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl leading-none">{title}</h2>
        {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <span className="text-gold text-xs font-medium tracking-widest uppercase">
          LEXIA · Wave 0
        </span>
        <h1 className="font-display text-4xl leading-none tracking-tight">
          Design System
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Tijolos compartilhados pelas telas de lista e de detalhe. Página de
          referência — cada componente com dados de exemplo pra revisão visual.
        </p>
      </header>

      <Section
        title="1 · KpiCard + KpiRow"
        hint="Ícone em quadrado tênue, rótulo maiúsculo, número em Fraunces, tom semântico. Clicável = filtro."
      >
        <KpiRow cols={5}>
          <KpiCard
            icon={Scale}
            label="Processos"
            value="1.284"
            tone="neutral"
          />
          <KpiCard
            icon={Gavel}
            label="Intimações"
            value="37"
            tone="info"
            sublabel="8 pendentes"
          />
          <KpiCard
            icon={Clock}
            label="Prazos"
            value="5"
            tone="warning"
            sublabel="vencendo em 3 dias"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Atrasados"
            value="2"
            tone="danger"
            active
          />
          <KpiCard
            icon={ListChecks}
            label="Concluídas"
            value="19"
            tone="success"
          />
        </KpiRow>
      </Section>

      <Section
        title="2 · StatusBadge (mapas por domínio)"
        hint="Rótulo + tom resolvido pelos helpers de domínio. Badge existente por baixo."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {["Pendente", "Em análise", "Resolvida", "Ignorada", "Crítica"].map(
              (s) => (
                <StatusBadge key={s} label={s} tone={intimacaoTone(s)} />
              ),
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              "Crítico",
              "Vencendo",
              "Aberto",
              "Futuro",
              "Vencido",
              "Cumprido",
            ].map((s) => (
              <StatusBadge key={s} label={s} tone={prazoTone(s)} />
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="3 · DataTable"
        hint="Colunas + linhas por render de célula, ponto de status à esquerda, coluna AÇÃO com kebab, rodapé Mostrando X a Y de Z."
      >
        <DataTable
          columns={DEMO_COLUMNS}
          rows={DEMO_ROWS}
          rowKey={(r) => r.id}
          statusTone={(r) => intimacaoTone(r.status)}
          rowActions={(r) => [
            { label: "Abrir", href: `/dev/ds#${r.id}` },
            { label: "Marcar como resolvida", icon: ScrollText },
            { label: "Ignorar", icon: Archive },
            { label: "Excluir", icon: Trash2, destructive: true },
          ]}
          rangeFrom={1}
          rangeTo={4}
          total={37}
          pagination={
            <ListPagination
              pageSize={25}
              onPageSizeChange={() => {}}
              pageNumber={1}
              canPrev={false}
              canNext
              onPrev={() => {}}
              onNext={() => {}}
              totalCount={37}
            />
          }
        />
      </Section>

      <Section
        title="4 · DetailLayout"
        hint="Breadcrumb + título + status + ações; faixa de Tabs; corpo em grade multi-coluna com aside."
      >
        <div className="bg-card/40 rounded-xl border p-6">
          <DetailLayout
            header={
              <DetailHeader
                breadcrumb={[
                  { label: "Processos", href: "/dev/ds" },
                  { label: "5001234-56.2024.8.26.0100" },
                ]}
                title="5001234-56"
                status={<StatusBadge label="Em análise" tone="info" />}
                subtitle="TJSP · 1º grau · Procedimento Comum Cível"
                actions={
                  <>
                    <Button size="sm">Gerar peça</Button>
                    <Button variant="outline" size="sm">
                      Mais ações
                    </Button>
                  </>
                }
              />
            }
          >
            <Tabs defaultValue="resumo">
              <TabsList aria-label="Abas do detalhe">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
                <TabsTrigger value="prazos">Prazos</TabsTrigger>
              </TabsList>
              <TabsContent value="resumo" className="mt-4">
                <DetailBody
                  aside={
                    <IAPanel placeholder="Análise da IA chega na Fase 3." />
                  }
                >
                  <div className="bg-card rounded-xl border p-5">
                    <p className="text-muted-foreground text-sm">
                      Corpo do detalhe (coluna principal). A feature preenche os
                      slots; o layout só posiciona.
                    </p>
                  </div>
                </DetailBody>
              </TabsContent>
              <TabsContent value="andamentos" className="mt-4">
                <Timeline>
                  <TimelineItem meta="07/08/2026" tone="gold">
                    <p className="text-sm font-medium">Intimação publicada</p>
                    <p className="text-muted-foreground text-sm">
                      Prazo de 15 dias para manifestação.
                    </p>
                  </TimelineItem>
                  <TimelineItem meta="01/08/2026">
                    <p className="text-sm font-medium">Juntada de petição</p>
                  </TimelineItem>
                  <TimelineItem meta="20/07/2026" last>
                    <p className="text-sm font-medium">Distribuição</p>
                  </TimelineItem>
                </Timeline>
              </TabsContent>
              <TabsContent value="prazos" className="mt-4">
                <EmptyState
                  icon={Clock}
                  title="Nenhum prazo em aberto"
                  description="Os prazos deste processo aparecem aqui."
                  phase="Chega na Fase 2"
                />
              </TabsContent>
            </Tabs>
          </DetailLayout>
        </div>
      </Section>

      <Section
        title="5 · FilterToolbar"
        hint="Busca + botão Filtros (ícone com contagem) — os filtros avançados moram no drawer da tela."
      >
        <FilterToolbar
          search=""
          onSearchChange={() => {}}
          placeholder="Buscar por número do processo…"
          onFilters={() => {}}
          activeFilters={2}
        />
      </Section>

      <Section
        title="6 · IAPanel (casca)"
        hint="Estrela + título, slots label/valor, barra de confiança. Estado placeholder claro. Não chama IA."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IAPanel>
            <IAField
              label="Classificação"
              value="Intimação — prazo processual"
            />
            <IAField label="Confiança" confidence={82} />
            <IAField
              label="Providência"
              value="Elaborar manifestação em 15 dias"
            />
          </IAPanel>
          <IAPanel placeholder="Análise da IA chega na Fase 3." />
        </div>
      </Section>

      <Section
        title="7 · ChecklistProgress (casca)"
        hint="Itens com check + data e barra X/Y concluídas. Itens via props."
      >
        <div className="bg-card max-w-md rounded-xl border p-5">
          <ChecklistProgress items={DEMO_CHECKLIST} />
        </div>
      </Section>

      <Section
        title="Extras já no tree"
        hint="EmptyState e Timeline (reusados acima)."
      >
        <EmptyState
          icon={FileText}
          title="Nenhuma peça gerada"
          description="A geração de peças com IA chega numa fatia futura."
          phase="Chega na Fase 2"
          action={
            <Button variant="outline" size="sm" disabled>
              Gerar peça
            </Button>
          }
        />
      </Section>
    </main>
  );
}
