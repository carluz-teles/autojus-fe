"use client";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PecaContexto, PecaContextoDoc } from "../../lib/peca-contexto";

export function ContextRail({
  contexto,
  onVerTeor,
  onVerAuto,
  tesesSlot,
  documentActions,
  summarySlot,
  attachmentsSlot,
  activeTab,
  onTabChange,
}: {
  contexto: PecaContexto;
  highlightedDocId: string | null;
  onVerTeor: () => void;
  onVerAuto: (d: PecaContextoDoc) => void;
  openingDocId: string | null;
  tesesSlot?: ReactNode;
  documentActions?: ReactNode;
  summarySlot?: ReactNode;
  attachmentsSlot?: ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}) {
  const { processo, intimacao, partes, autos } = contexto;
  return (
    <aside
      aria-label="Contexto da peça"
      className="bg-background flex min-h-0 w-full flex-col text-sm"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange?.(String(value))}
        defaultValue="summary"
        className="min-h-0 flex-1"
      >
        <TabsList aria-label="Contexto da peça">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          {attachmentsSlot && (
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          )}
          {tesesSlot && <TabsTrigger value="grounds">Teses</TabsTrigger>}
        </TabsList>
        <TabsContent value="summary" keepMounted className="m-0 animate-none">
          <div className="border-b p-4">
            <p className="text-muted-foreground text-xs">Prazo da intimação</p>
            <p className="mt-1 font-medium">
              {intimacao.prazoLabel || "Sem prazo confirmado"}
            </p>
          </div>
          {summarySlot}
          <section
            aria-label="Dados do processo"
            className="flex flex-col gap-5 p-4"
          >
            <h3 className="font-medium">Dados do processo</h3>
            <div>
              <p className="font-mono text-xs">{processo.cnj}</p>
              <p className="mt-2">{processo.classe}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {[processo.orgao, processo.tribunalGrau]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-muted-foreground text-xs">Assunto</dt>
                <dd>{processo.assunto || "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Valor da causa
                </dt>
                <dd>{processo.valor || "Não informado"}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3">
              <p className="font-medium">Partes do processo</p>
              {partes.map((p) => (
                <div key={`${p.roleLabel}-${p.name}`}>
                  <p className="text-muted-foreground text-xs">{p.roleLabel}</p>
                  <p>{p.name}</p>
                  {p.counselLabel && (
                    <p className="text-muted-foreground text-xs">
                      {p.counselLabel}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </TabsContent>
        {attachmentsSlot && (
          <TabsContent
            value="attachments"
            keepMounted
            className="m-0 animate-none p-4"
          >
            {attachmentsSlot}
          </TabsContent>
        )}
        <TabsContent
          value="sources"
          keepMounted
          className="m-0 animate-none space-y-3 p-4"
        >
          <p className="text-muted-foreground text-xs">
            Documentos disponíveis. Uma fonte listada só integra a fundamentação
            quando citada no texto.
          </p>
          {intimacao.id ? (
            <>
              <Button
                variant="outline"
                className="h-auto w-full justify-start py-3 text-left"
                onClick={onVerTeor}
                disabled={!intimacao.teor.trim()}
              >
                <span>
                  Intimação de origem
                  <span className="text-muted-foreground mt-1 block text-xs">
                    Publicação: {intimacao.publishedAt || "Não informada"}
                  </span>
                </span>
              </Button>
              {!intimacao.teor.trim() && (
                <p className="text-muted-foreground text-xs">
                  O teor desta intimação está indisponível.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Esta peça não possui intimação de origem. Consulte os documentos
              do processo abaixo.
            </p>
          )}
          {documentActions}
          {autos.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Nenhum auto disponível. Confira a integração com o tribunal ou
              anexe os documentos necessários.
            </p>
          )}
          {Array.from(new Map(autos.map((a) => [a.id, a])).values()).map(
            (d) => (
              <Button
                key={d.id}
                variant="outline"
                className="h-auto w-full justify-start py-3 text-left whitespace-normal"
                disabled={d.status === "PENDING" || d.status === "FAILED"}
                onClick={() => onVerAuto(d)}
              >
                <span className="min-w-0 break-words">
                  {d.name}
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {d.meta}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {d.status === "FAILED"
                      ? "Falha no processamento · indisponível para fundamentação"
                      : d.status === "READY"
                        ? "Texto disponível para consulta"
                        : d.status === "PENDING"
                          ? "Aguardando download"
                          : d.status
                            ? "Processando · texto ainda indisponível"
                            : d.category}
                  </span>
                </span>
              </Button>
            ),
          )}
        </TabsContent>
        {tesesSlot && (
          <TabsContent
            value="grounds"
            keepMounted
            className="m-0 animate-none p-4"
          >
            {tesesSlot}
          </TabsContent>
        )}
      </Tabs>
    </aside>
  );
}
