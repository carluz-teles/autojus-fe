"use client";

import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AndamentosTimeline } from "@/features/andamentos/components/andamentos-timeline";
import { ProcessoDocumentos } from "@/features/documentos/components/processo-documentos";
import { ProcessoIntimacoes } from "@/features/intimacoes/components/processo-intimacoes";
import { ProcessoPrazos } from "@/features/prazos/components/processo-prazos";
import { ProcessoTasks } from "@/features/tasks/components/processo-tasks";
import { ApiError } from "@/lib/api/errors";

import { useProcessoCockpit } from "../../hooks/use-processo-cockpit";
import { CockpitHeader } from "./cockpit-header";
import { OverviewCards } from "./overview-cards";
import { PartesCards } from "./partes-cards";
import { ProximaProvidenciaCard } from "./proxima-providencia-card";
import { ResumoTab } from "./resumo-tab";

// Página do processo (cockpit) — Fase 1: shell sobre o dado que já existe, sem
// IA e sem protocolo. Compõe o header (§6), a barra de alertas (§7), os cards de
// visão geral (§8) e as abas. Componente = binding: tudo vem de
// useProcessoCockpit (detalhe + prazos/tasks/intimações + risco/providência).
export function ProcessoCockpit({ processoId }: { processoId: string }) {
  const {
    processo,
    isPending,
    isError,
    error,
    proximoPrazo,
    risco,
    providencia,
    counts,
  } = useProcessoCockpit(processoId);

  if (isPending) {
    return <CockpitSkeleton />;
  }

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  if (isError || !processo) {
    return (
      <>
        <div className="reveal">
          <Link
            href="/processos"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            ← Processos
          </Link>
        </div>
        <PageHeader
          title={notFound ? "Processo não encontrado" : "Erro ao carregar"}
          description={
            notFound
              ? "Ele pode ter sido removido ou o link está incorreto."
              : error instanceof ApiError
                ? error.message
                : "Tente novamente em instantes."
          }
        />
        <div className="reveal mt-8">
          <Link href="/processos" className="text-gold text-sm hover:underline">
            Voltar para os processos
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CockpitHeader processo={processo} riskLevel={risco.level} />

      <ProximaProvidenciaCard providencia={providencia} />

      <OverviewCards proximoPrazo={proximoPrazo} counts={counts} />

      <PartesCards
        processoId={processoId}
        assignedUserId={processo.assigned_user_id}
        assignedUserName={processo.assigned_user_name}
      />

      <Tabs defaultValue="resumo" className="reveal flex flex-col gap-5">
        <div className="overflow-x-auto">
          <TabsList aria-label="Seções do processo">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
            <TabsTrigger value="intimacoes">
              Intimações
              {counts.intimacoesTriagemPendente > 0 ? (
                <Badge variant="destructive">
                  {counts.intimacoesTriagemPendente}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="prazos">
              Prazos
              {counts.prazosVivos > 0 ? (
                <Badge variant="destructive">{counts.prazosVivos}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="tarefas">
              Tarefas
              {counts.tasksAbertas > 0 ? (
                <Badge variant="destructive">{counts.tasksAbertas}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumo">
          <ResumoTab
            processoId={processoId}
            providencia={providencia}
            risco={risco}
          />
        </TabsContent>

        <TabsContent value="andamentos">
          <AndamentosTimeline processoId={processoId} />
        </TabsContent>

        <TabsContent value="intimacoes">
          <ProcessoIntimacoes processoId={processoId} />
        </TabsContent>

        <TabsContent value="prazos">
          <ProcessoPrazos processoId={processoId} />
        </TabsContent>

        <TabsContent value="tarefas">
          <ProcessoTasks processoId={processoId} />
        </TabsContent>

        <TabsContent value="documentos">
          <ProcessoDocumentos processoId={processoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CockpitSkeleton() {
  return (
    <div className="reveal flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b pb-6">
        <div className="bg-muted h-3 w-40 animate-pulse rounded" />
        <div className="bg-muted h-8 w-72 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 max-w-full animate-pulse rounded" />
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted h-10 animate-pulse rounded" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-muted h-28 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
