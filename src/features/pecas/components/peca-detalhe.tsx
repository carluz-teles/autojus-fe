"use client";

import {
  ArrowRight,
  Copy,
  FileText,
  GitCompare,
  History,
  ListChecks,
  MoreVertical,
  Paperclip,
  PenLine,
  ScrollText,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DetailBody,
  DetailHeader,
  DetailLayout,
} from "@/components/ui/detail-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { SheetField } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// TELA 2 — Detalhe da Peça (deep-link /pecas/[id]) no design LEXIA. CASCA: o
// backend de Peças é FASE 4 e ainda NÃO existe, então todos os campos são
// placeholder "Fase 4" (sem dado real), o "Abrir editor" é desabilitado e o painel
// lateral "Ações rápidas com IA" lista ações DESABILITADAS. Componente = binding.

// Ações rápidas com IA do design — todas DESABILITADAS (Fase 4).
const IA_ACTIONS: { label: string; icon: typeof Wand2 }[] = [
  { label: "Melhorar redação", icon: Wand2 },
  { label: "Sugerir fundamentos", icon: ScrollText },
  { label: "Verificar coerência", icon: ListChecks },
  { label: "Comparar com peça anterior", icon: GitCompare },
  { label: "Gerar pedidos", icon: FileText },
];

export function PecaDetalhe({ id }: { id: string }) {
  // Sem BE (Fase 4): derivamos só um código legível do id da rota para o
  // breadcrumb/título. Nenhum dado de peça é buscado ou fabricado.
  const code = codeFromId(id);

  return (
    <DetailLayout
      header={
        <DetailHeader
          breadcrumb={[{ label: "Peças", href: "/pecas" }, { label: code }]}
          title={code}
          status={<StatusBadge label="Rascunho" tone="neutral" />}
          subtitle={
            <span className="inline-flex items-center gap-2">
              Casca do design — o conteúdo desta peça chega na Fase 4.
              <Badge variant="outline">Prévia · Fase 4</Badge>
            </span>
          }
          actions={
            <>
              {/* Placeholder: o editor de minutas chega na Fase 4. */}
              <Button size="sm" disabled title="Chega na Fase 4">
                <PenLine /> Abrir editor
              </Button>
              <RowActions
                label="Mais ações"
                items={[
                  { label: "Duplicar", icon: Copy, disabled: true },
                  { label: "Anexar arquivo", icon: Paperclip, disabled: true },
                  {
                    label: "Arquivar",
                    icon: Trash2,
                    destructive: true,
                    disabled: true,
                  },
                ]}
              />
            </>
          }
        />
      }
    >
      <DetailBody
        aside={
          <>
            <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1">
              <header className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </span>
                <h3 className="font-display text-base leading-none">
                  Ações rápidas com IA
                </h3>
              </header>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Refine a minuta com a IA a partir dos autos. Disponível quando a
                produção de peças chegar na Fase 4.
              </p>
              <ul className="flex flex-col gap-1.5">
                {IA_ACTIONS.map((a) => (
                  <li key={a.label}>
                    <button
                      type="button"
                      disabled
                      title="Chega na Fase 4"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm",
                        "text-muted-foreground cursor-not-allowed opacity-60",
                      )}
                    >
                      <a.icon className="size-4 shrink-0" />
                      {a.label}
                    </button>
                  </li>
                ))}
              </ul>
              <span className="border-gold/40 bg-gold/[0.06] text-gold w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium">
                Chega na Fase 4
              </span>
            </section>

            <section className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 text-sm shadow-sm ring-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Próximo passo
              </p>
              <p className="text-foreground/85 leading-relaxed">
                Continuar a edição no editor de minutas.
              </p>
              {/* Placeholder: editor chega na Fase 4. */}
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Chega na Fase 4"
                className="w-full"
              >
                Abrir editor <ArrowRight />
              </Button>
            </section>
          </>
        }
      >
        <Tabs defaultValue="detalhes">
          <TabsList aria-label="Abas da peça">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="versoes">Versões</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="mt-4">
            <div className="flex flex-col gap-6">
              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Origem">Fase 4</SheetField>
                <SheetField label="Processo">Fase 4</SheetField>
                <SheetField label="Prazo relacionado">Fase 4</SheetField>
                <SheetField label="Status">Fase 4</SheetField>
                <SheetField label="Versão">Fase 4</SheetField>
                <SheetField label="Responsável">Fase 4</SheetField>
              </dl>

              <EmptyState
                icon={FileText}
                title="Conteúdo da peça chega na Fase 4"
                description="As informações da minuta (origem, prazo relacionado, status e versão) aparecem aqui quando a produção de peças com IA estiver disponível."
                phase="Chega na Fase 4"
              />
            </div>
          </TabsContent>

          <TabsContent value="versoes" className="mt-4">
            <EmptyState
              icon={History}
              title="Histórico de versões chega na Fase 4"
              description="Cada revisão da minuta — quem alterou, quando e o quê — será listada aqui."
              phase="Chega na Fase 4"
            />
          </TabsContent>

          <TabsContent value="anexos" className="mt-4">
            <EmptyState
              icon={Paperclip}
              title="Anexos chegam na Fase 4"
              description="Documentos e arquivos vinculados à peça aparecem aqui."
              phase="Chega na Fase 4"
            />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <EmptyState
              icon={MoreVertical}
              title="Histórico chega na Fase 4"
              description="As mudanças de status e os eventos desta peça serão registrados aqui."
              phase="Chega na Fase 4"
            />
          </TabsContent>
        </Tabs>
      </DetailBody>
    </DetailLayout>
  );
}

// Deriva um código legível "PEC-XXXX" do id da rota — só para o título/breadcrumb
// da casca. Não é dado de peça; é apenas o eco do parâmetro da URL.
function codeFromId(id: string): string {
  const head = id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `PEC-${head || "0000"}`;
}
