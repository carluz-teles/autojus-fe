"use client";

import { FileText, Gavel, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetField,
  SheetSection,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessoPrazos } from "@/features/prazos/components/processo-prazos";
import type {
  ProcessoDegree,
  ProcessoSecrecy,
  ProcessoView,
} from "@/features/processos/types";
import { ProcessoTasks } from "@/features/tasks/components/processo-tasks";

const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  UNKNOWN: "Grau não informado",
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado Especial",
  SUPERIOR: "Instância superior",
};

const SECRECY_LABEL: Record<ProcessoSecrecy, string> = {
  PUBLIC: "Público",
  RESTRICTED: "Restrito",
  SECRET: "Sigiloso",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function completenessPct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.round(pct));
}

// Detalhe do processo consolidado em drawer. Resumo traz o que o read model já
// entrega (dados do tribunal + completude + último andamento). As demais abas
// mapeiam os domínios que penduram no court_record (docket_entry, intimação,
// deadline, draft/petition) e ganham conteúdo quando o sync/IA alimentarem —
// por ora, estados vazios honestos. A tela dedicada de processo vem depois.
export function ProcessoDetail({
  processo,
  open,
  onOpenChange,
  onOpenChangeComplete,
}: {
  processo: ProcessoView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      {processo ? (
        <SheetContent
          eyebrow={
            <>
              <Badge variant="secondary">
                {DEGREE_LABEL[processo.degree] ?? processo.degree}
              </Badge>
              {processo.secrecy !== "PUBLIC" ? (
                <Badge variant="outline">
                  {SECRECY_LABEL[processo.secrecy] ?? processo.secrecy}
                </Badge>
              ) : null}
            </>
          }
          title={processo.cnj_number}
          description={`${processo.court}${
            processo.class ? ` · ${processo.class}` : ""
          }`}
        >
          <Tabs defaultValue="resumo">
            <TabsList aria-label="Seções do processo">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
              <TabsTrigger value="intimacoes">Intimações</TabsTrigger>
              <TabsTrigger value="prazos">Prazos</TabsTrigger>
              <TabsTrigger value="pecas">Peças</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="mt-5 flex flex-col gap-6">
              <div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>Completude do processo</span>
                  <span className="tabular-nums">
                    {completenessPct(processo.completeness)}%
                  </span>
                </div>
                <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-gold h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${completenessPct(processo.completeness)}%`,
                    }}
                  />
                </div>
              </div>

              <dl className="rounded-xl border p-4">
                <SheetField label="Grau">
                  {DEGREE_LABEL[processo.degree] ?? processo.degree}
                </SheetField>
                <SheetField label="Órgão julgador">
                  {processo.judging_body || "—"}
                </SheetField>
                <SheetField label="Classe">{processo.class || "—"}</SheetField>
                <SheetField label="Assunto">
                  {processo.subject || "—"}
                </SheetField>
                <SheetField label="Ajuizamento">
                  {fmtDate(processo.filed_at)}
                </SheetField>
                <SheetField label="Sigilo">
                  {SECRECY_LABEL[processo.secrecy] ?? processo.secrecy}
                </SheetField>
              </dl>

              <SheetSection title="Último andamento">
                {processo.last_movement_text ? (
                  <>
                    {processo.last_movement_at ? (
                      <span className="text-muted-foreground tabular-nums">
                        {fmtDate(processo.last_movement_at)} —{" "}
                      </span>
                    ) : null}
                    {processo.last_movement_text}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Nenhum andamento registrado ainda.
                  </span>
                )}
              </SheetSection>
            </TabsContent>

            <TabsContent value="andamentos" className="mt-5">
              <EmptyTab
                icon={ScrollText}
                text="Os andamentos (DATAJUD) deste processo aparecem aqui após o enriquecimento."
              />
            </TabsContent>
            <TabsContent value="intimacoes" className="mt-5">
              <EmptyTab
                icon={Gavel}
                text="As intimações (DJEN) vinculadas a este processo aparecem aqui."
              />
            </TabsContent>
            <TabsContent value="prazos" className="mt-5 flex flex-col gap-6">
              {/* Prazos + Tarefas juntos: a tarefa nasce do prazo/intimação, então
                  compartilham contexto — mais limpo que uma aba separada. */}
              <ProcessoPrazos processoId={processo.id} />
              <div className="flex flex-col gap-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Tarefas
                </h3>
                <ProcessoTasks processoId={processo.id} />
              </div>
            </TabsContent>
            <TabsContent value="pecas" className="mt-5">
              <EmptyTab
                icon={FileText}
                text="As peças e minutas geradas para este processo aparecem aqui."
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

function EmptyTab({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
      <Icon className="size-5 opacity-60" />
      <span className="max-w-xs">{text}</span>
    </div>
  );
}
