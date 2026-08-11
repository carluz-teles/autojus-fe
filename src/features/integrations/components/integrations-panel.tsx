"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/errors";

import { useIntegrations } from "../hooks/use-integrations";
import { useReconciliations } from "../hooks/use-reconciliations";
import { SOURCE_CATALOG } from "../types";
import { ReconciliationsTab } from "./reconciliations-tab";
import { SourceCard } from "./source-card";

const fmtInt = new Intl.NumberFormat("pt-BR");

// Tela de integrações: Fontes (as CONEXÕES com as fontes de dados — futuras
// exigirão credencial/login) e Reconciliações (progresso da importação +
// histórico de execuções). É o lugar permanente que responde "o que o sistema
// está fazendo com meus dados?". Os TERMOS monitorados (o que vigiar) moram em
// /settings/termos — o card DJEN só exibe o scope e aponta pra lá.
export function IntegrationsPanel() {
  const { integrations, isLoading, error } = useIntegrations();
  const recon = useReconciliations();

  const bySource = new Map(integrations.map((i) => [i.source, i]));
  const importing = recon.data?.import.importing ?? false;
  // Quantas janelas com erro no total das importações — o badge na aba. Guard
  // defensivo: ?? [] cobre uma resposta sem a chave (ex.: BE numa versão anterior).
  const recons = recon.data?.reconciliations ?? [];
  const failedRuns = recons.reduce((n, u) => n + u.slices_error, 0);

  // Rodapé do card DJEN: a última importação que terminou (o dado que responde
  // "quando isso rodou pela última vez?" sem sair da aba Fontes).
  const lastImport = recons.find((u) => u.status !== "RUNNING");
  const djenFooter = importing
    ? "Importação do histórico em andamento — acompanhe em Reconciliações."
    : lastImport
      ? `Última importação: ${fmtInt.format(lastImport.processos)} ${
          lastImport.processos === 1 ? "processo" : "processos"
        }, ${fmtInt.format(lastImport.intimacoes)} intimações.`
      : undefined;

  return (
    <div className="mt-8 flex flex-col gap-5">
      <Tabs defaultValue="fontes">
        <div className="flex items-center justify-between gap-3">
          <TabsList aria-label="Seções de integrações">
            <TabsTrigger value="fontes">Fontes</TabsTrigger>
            <TabsTrigger value="reconciliacoes">
              Reconciliações
              {failedRuns > 0 ? (
                <span className="bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                  {failedRuns}
                </span>
              ) : importing ? (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="fontes" className="mt-5 flex flex-col gap-5">
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {isLoading
              ? SOURCE_CATALOG.map((s) => (
                  <div
                    key={s.id}
                    className="bg-muted/40 h-52 animate-pulse rounded-xl border"
                  />
                ))
              : SOURCE_CATALOG.map((entry) => (
                  <SourceCard
                    key={entry.id}
                    entry={entry}
                    integration={bySource.get(entry.id)}
                    importing={entry.id === "DJEN" && importing}
                    footer={entry.id === "DJEN" ? djenFooter : undefined}
                    termsHref={
                      entry.id === "DJEN" ? "/settings/termos" : undefined
                    }
                  />
                ))}
          </section>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error instanceof ApiError
                ? error.message
                : "Não foi possível carregar suas integrações."}
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="reconciliacoes" className="mt-5">
          <ReconciliationsTab
            data={recon.data}
            isPending={recon.isPending}
            isError={recon.isError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
