"use client";

import { CheckCircle2, ExternalLink, History, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import {
  DetailBody,
  DetailHeader,
  DetailLayout,
} from "@/components/ui/detail-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { SheetField, SheetSection } from "@/components/ui/sheet";
import { intimacaoTone, StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreatePeca } from "@/features/pecas/hooks/use-create-peca";
import { ConfirmarPrazo } from "@/features/prazos/components/confirmar-prazo";
import { usePrazoDaIntimacao } from "@/features/prazos/hooks/use-prazo-da-intimacao";
import { formatDate } from "@/lib/format";

import { useIntimacaoActions } from "../hooks/use-intimacao-actions";
import {
  daysLeftLabel,
  DEGREE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  userStatusLabel,
} from "../lib/labels";
import type { IntimacaoDetalheView } from "../types";
import { AnaliseSection } from "./analise-section";
import { DescriptionContent } from "./description-content";

// TELA 1 — Detalhe da Intimação (deep-link /intimacoes/[id]) no design LEXIA.
// Monta o DetailLayout da Wave 0: breadcrumb + título + StatusBadge(user_status) +
// ações; três abas (Detalhes reais, Análise — resumo/recomendação/tarefas sugeridas
// da IA, Histórico placeholder). Componente = binding: os estados/ações vêm dos hooks.
export function IntimacaoDetalhe({
  intimacao,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  const router = useRouter();
  const { resolve } = useIntimacaoActions();
  const { createPecaAsync, isPending: isPecaPending } = useCreatePeca();
  const statusLabel = userStatusLabel(intimacao.user_status);
  const isResolved = intimacao.user_status === "RESOLVED";
  const deadlineDays = daysLeftLabel(intimacao.deadline_start_at);

  const handlePeticionar = () => {
    void createPecaAsync(
      { source: "intimation", intimation_id: intimacao.id },
      {
        onSuccess: (res) => {
          router.push(`/pecas/${res.data.id}`);
        },
      },
    );
  };

  const breadcrumb = useMemo(
    () => [
      { label: "Intimações", href: "/intimacoes" },
      { label: intimacao.cnj_number },
    ],
    [intimacao.cnj_number],
  );
  useSetBreadcrumb(breadcrumb);

  return (
    <DetailLayout
      header={
        <DetailHeader
          title={intimacao.cnj_number}
          status={
            <StatusBadge
              label={statusLabel}
              tone={intimacaoTone(statusLabel)}
            />
          }
          subtitle={`${intimacao.court} · ${
            DEGREE_LABEL[intimacao.degree] ?? intimacao.degree
          }`}
          actions={
            <>
              <Button
                size="sm"
                disabled={isResolved || resolve.isPending}
                onClick={() => resolve.mutate(intimacao.id)}
              >
                <CheckCircle2 />
                {isResolved ? "Resolvida" : "Marcar como resolvida"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isResolved || isPecaPending}
                aria-label={
                  isResolved
                    ? "Intimação já resolvida — peticionamento indisponível"
                    : "Peticionar — abrir editor de peça para esta intimação"
                }
                title={isResolved ? "Intimação já resolvida" : undefined}
                onClick={handlePeticionar}
              >
                <Sparkles /> {isPecaPending ? "Criando peça…" : "Peticionar"}
              </Button>
              <RowActions
                label="Mais ações"
                items={[
                  {
                    label: "Abrir no tribunal",
                    icon: ExternalLink,
                    href: intimacao.source_url || undefined,
                    disabled: !intimacao.source_url,
                  },
                ]}
              />
            </>
          }
        />
      }
    >
      <Tabs defaultValue="detalhes">
        <TabsList aria-label="Abas da intimação">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="ia">Análise</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4">
          <DetailBody
            aside={
              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Tipo">
                  {TYPE_LABEL[intimacao.type] ?? intimacao.type}
                </SheetField>
                <SheetField label="Situação (DJEN)">
                  {STATUS_LABEL[intimacao.status] ?? intimacao.status}
                </SheetField>
                <SheetField label="Início do prazo" emphasis>
                  {formatDate(intimacao.deadline_start_at)}
                  {deadlineDays ? ` · ${deadlineDays}` : ""}
                </SheetField>
                <SheetField label="Disponibilização">
                  {formatDate(intimacao.made_available_at)}
                </SheetField>
                <SheetField label="Publicação">
                  {formatDate(intimacao.published_at)}
                </SheetField>
                <SheetField label="Origem">
                  {intimacao.source || "—"}
                </SheetField>
              </dl>
            }
          >
            <div className="flex flex-col gap-6">
              <SheetSection title="Teor da publicação">
                {intimacao.content ? (
                  <DescriptionContent content={intimacao.content} />
                ) : (
                  <p className="text-muted-foreground">
                    Sem teor disponível nesta publicação.
                  </p>
                )}
              </SheetSection>

              <dl className="bg-card ring-foreground/10 rounded-xl p-5 shadow-sm ring-1">
                <SheetField label="Processo">
                  <Link
                    href={`/intimacoes?search=${encodeURIComponent(
                      intimacao.cnj_number,
                    )}`}
                    className="text-gold hover:underline"
                  >
                    {intimacao.cnj_number}
                  </Link>
                </SheetField>
              </dl>

              <SheetSection title="Destinatários">
                {intimacao.recipients.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {intimacao.recipients.map((r, i) => (
                      <li
                        key={`${r.oab_number}-${r.oab_uf}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          OAB {r.oab_number || "—"}
                          {r.oab_uf ? `/${r.oab_uf}` : ""}
                          {r.matched ? (
                            <span className="text-gold ml-2 font-medium">
                              monitorada
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum destinatário informado.
                  </p>
                )}
              </SheetSection>

              {/* F2 — o coração do produto: confirma o prazo derivado e monta as
                  tarefas (pré-preenchidas pela IA quando o prazo é PENDING). Auto-contido:
                  busca o prazo da intimação sozinho e degrada gracioso quando não há um. */}
              <SheetSection title="Prazo & Tarefas">
                <ConfirmarPrazo intimationId={intimacao.id} />
              </SheetSection>
            </div>
          </DetailBody>
        </TabsContent>

        <TabsContent value="ia" className="mt-4">
          <IntimacaoAnalise intimacao={intimacao} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <EmptyState
            icon={History}
            title="Sem histórico ainda"
            description="As mudanças de situação desta intimação aparecem aqui."
            phase="Chega numa próxima fatia"
          />
        </TabsContent>
      </Tabs>
    </DetailLayout>
  );
}

// Aba "Análise": resolve o prazo derivado da intimação (usePrazoDaIntimacao) e
// delega ao AnaliseSection — mesma fonte usada no drawer da lista (Regra nº1),
// que resume o teor, recomenda e sugere tarefas (com fallback pro teor bruto
// quando o LLM está off). Sem prazo derivado ainda, mostra só o teor completo
// pra a informação não sumir.
function IntimacaoAnalise({ intimacao }: { intimacao: IntimacaoDetalheView }) {
  const { state, prazo } = usePrazoDaIntimacao(intimacao.id);

  if (state === "loading") {
    return <p className="text-muted-foreground text-sm">Carregando análise…</p>;
  }

  if (prazo) {
    return <AnaliseSection prazo={prazo} fallbackContent={intimacao.content} />;
  }

  return (
    <SheetSection title="O que aconteceu">
      {intimacao.content ? (
        <DescriptionContent content={intimacao.content} />
      ) : (
        <p className="text-muted-foreground">
          Sem teor disponível nesta publicação.
        </p>
      )}
    </SheetSection>
  );
}
