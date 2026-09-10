"use client";

// Mockup — modelo COLAPSADO da triagem/providência.
// A IA recomenda A ação da intimação; o usuário age em 1 movimento e a
// providência nasce comprometida (não como um card SUGGESTED a curar).
// Rota dev, dados hardcoded, sem BE. Ver docs/design-fulfillment-decoupling.md.

import {
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MoreHorizontal,
  PenLine,
  Sparkles,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function PrazoBadge({
  label,
  tone = "normal",
}: {
  label: string;
  tone?: "normal" | "atencao" | "atraso";
}) {
  const variant =
    tone === "atraso"
      ? "destructive"
      : tone === "atencao"
        ? "warning"
        : "outline";
  return (
    <Badge variant={variant}>
      <Clock data-icon="inline-start" />
      {label}
    </Badge>
  );
}

function Resp({ nome }: { nome?: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      <User className="size-3.5" aria-hidden />
      {nome ?? "Sem responsável"}
    </span>
  );
}

/** Alerta colapsável de cumprimento — mesmo idiom do ProvidenciaFulfillment real. */
function CumprimentoAlert() {
  return (
    <details className="group/f border-gold/30 bg-gold/5 rounded-lg border px-3 py-2">
      <summary className="text-gold-foreground flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        Possível cumprimento nos autos
        <ChevronDown
          aria-hidden
          className="ml-auto size-4 shrink-0 transition-transform group-open/f:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <p className="text-muted-foreground mt-2 border-l-2 pl-3 text-sm whitespace-pre-wrap">
        Carta AR expedida para SAMIRA no endereço indicado em 27/08/2026. O
        registro demonstra a utilização do endereço, mas não confirma
        isoladamente o atendimento integral pela parte exequente.
      </p>
    </details>
  );
}

function TriageCard({
  tone,
  prazo,
  prazoTone,
  resp,
  processo,
  teor,
  variant,
}: {
  tone: "atencao" | "normal";
  prazo: string;
  prazoTone?: "normal" | "atencao" | "atraso";
  resp?: string;
  processo: string;
  teor: string;
  variant: "analisando" | "peca" | "concluir" | "cumprimento" | "revisar";
}) {
  return (
    <article className="surface-panel flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <PrazoBadge label={prazo} tone={prazoTone} />
        {variant === "analisando" ? (
          <Badge variant="secondary">recém-chegada</Badge>
        ) : variant === "revisar" ? (
          <Badge variant="secondary">revisar</Badge>
        ) : tone === "atencao" ? (
          <Badge variant="warning">atenção</Badge>
        ) : null}
        <span className="ml-auto">
          <Resp nome={resp} />
        </span>
      </div>

      <div>
        <p className="text-muted-foreground text-xs">{processo}</p>
        <p className="mt-1 text-sm">{teor}</p>
      </div>

      <div className="flex flex-col gap-3 border-t pt-3">
        {variant === "analisando" ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analisando… a ação recomendada preenche em instantes
          </p>
        ) : variant === "revisar" ? (
          <>
            <p className="text-gold-foreground flex items-center gap-2 text-sm">
              <TriangleAlert className="size-4" aria-hidden />
              Confiança baixa — a ação não é óbvia
            </p>
            <div>
              <Button variant="outline" size="sm">
                Revisar
              </Button>
              <span className="text-muted-foreground ml-2 text-xs">
                → abre o detalhe pra você decidir
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="section-label flex items-center gap-1.5">
                <Sparkles className="size-3" aria-hidden />
                Ação recomendada
              </p>
            </div>

            {variant === "peca" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-medium">
                    Contestação
                  </span>
                  <Badge variant="secondary">gera peça</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button>
                    <PenLine data-icon="inline-start" />
                    Gerar peça
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    Concluir
                  </Button>
                  <Button variant="ghost" size="sm">
                    <X data-icon="inline-start" />
                    Dispensar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mais ações"
                  >
                    <MoreHorizontal />
                  </Button>
                </div>
              </>
            )}

            {variant === "concluir" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-medium">
                    Ciência
                  </span>
                  <span className="text-muted-foreground text-sm">
                    — nada a peticionar
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button>
                    <Check data-icon="inline-start" />
                    Concluir
                  </Button>
                  <Button variant="ghost" size="sm">
                    Gerar peça
                  </Button>
                  <Button variant="ghost" size="sm">
                    Dispensar
                  </Button>
                </div>
              </>
            )}

            {variant === "cumprimento" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-medium">
                    Criar já concluída
                  </span>
                </div>
                <CumprimentoAlert />
                <div className="flex flex-wrap items-center gap-2">
                  <Button>
                    <Check data-icon="inline-start" />
                    Criar já concluída
                  </Button>
                  <Button variant="ghost" size="sm">
                    Gerar peça
                  </Button>
                  <Button variant="ghost" size="sm">
                    Dispensar
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/** Card que transiciona sozinho: recém-chegada → Analisando… → Ação recomendada.
 *  Demonstra que a análise roda async (worker) na CHEGADA da intimação e preenche
 *  a triagem sem o usuário clicar "analisar" — a triagem é dona do pipeline. */
function TriageCardArriving() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <TriageCard
      variant={ready ? "peca" : "analisando"}
      tone="atencao"
      prazo="vence 09/09 · 3 dias úteis"
      prazoTone="atencao"
      processo="Procedimento Comum · 0007777-11.2026.8.26.0100 · TJSP · 5ª V. Cível"
      teor="Fica o réu intimado para apresentar contestação no prazo de 15 dias."
    />
  );
}

/** Detalhe da intimação — hero "Ação recomendada" + aside de prazo, com toggle
 *  para o estado pós-ação (a providência nasce comprometida, foco vira a peça). */
function IntimacaoDetalhe() {
  const [committed, setCommitted] = useState(false);
  return (
    <div className="surface-panel overflow-hidden">
      <div className="border-b px-5 py-3">
        <p className="text-muted-foreground text-xs">Intimação</p>
        <h3 className="font-display text-lg font-medium">
          4001542-14.2026.8.26.0506 · Procedimento Comum · TJSP
        </h3>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Coluna principal */}
        <div className="flex min-w-0 flex-col gap-4">
          {!committed ? (
            <>
              <div>
                <p className="section-label flex items-center gap-1.5">
                  <Sparkles className="size-3" aria-hidden />
                  Ação recomendada
                </p>
                <div className="surface-inset mt-2 flex flex-col gap-3 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-medium">
                      Contestação
                    </span>
                    <Badge variant="secondary">gera peça</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Réu intimado para apresentar contestação no prazo de 15
                    dias.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => setCommitted(true)}>
                      <PenLine data-icon="inline-start" />
                      Gerar peça
                      <ChevronDown data-icon="inline-end" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Check data-icon="inline-start" />
                      Concluir
                    </Button>
                    <Button variant="ghost" size="sm">
                      Dispensar
                    </Button>
                  </div>
                </div>
              </div>

              <details className="group/o">
                <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 transition-transform group-open/o:rotate-180" />
                  Outras ações possíveis (2)
                </summary>
                <div className="divide-y">
                  {["Juntar procuração", "Ciência"].map((a) => (
                    <div
                      key={a}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span>{a}</span>
                      <Button variant="ghost" size="xs">
                        + adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <div>
              <p className="section-label">Trabalho em andamento</p>
              <div className="surface-inset mt-2 flex items-center gap-3 rounded-xl p-4">
                <PenLine className="text-primary size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-medium">
                    Contestação
                  </p>
                  <p className="text-muted-foreground text-xs">
                    gerando peça… · vence 08/09 · João Silva
                  </p>
                </div>
                <Button size="sm">Abrir editor</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommitted(false)}
                >
                  desfazer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Aside — prazo/responsável (inalterado do produto) */}
        <aside className="flex flex-col gap-4">
          <div>
            <p className="section-label">Prazo e responsável</p>
            <div className="surface-inset mt-2 rounded-xl p-4">
              <p className="text-muted-foreground text-xs">Vencimento</p>
              <p className="font-display text-destructive text-2xl font-medium">
                08/09/2026
              </p>
              <p className="text-muted-foreground text-xs">1 dia em atraso</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Tipo do ato</p>
            <p>Manifestação</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Responsável</p>
            <Button variant="outline" size="sm" className="mt-1">
              <User data-icon="inline-start" />
              Atribuir
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="bg-background mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <p className="section-label">Mockup · modelo colapsado</p>
        <h1 className="font-display text-2xl font-medium">
          Triagem → ação direta (sem o passo de revisão)
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A IA recomenda A ação; o usuário age em 1 clique; a providência nasce
          comprometida. Rota dev — dados mockados.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-medium">Triagem (inbox)</h2>
          <p className="text-muted-foreground text-sm">
            A intimação chega, o prazo aparece na hora, e a análise roda sozinha
            no worker — a triagem já entrega a ação recomendada. O 1º card
            preenche sozinho (recém-chegada → recomendada).
          </p>
        </div>
        <TriageCardArriving />
        <TriageCard
          variant="peca"
          tone="atencao"
          prazo="vence 08/09 · 2 dias úteis"
          prazoTone="atencao"
          processo="Procedimento Comum · 0001234-56.2026.8.26.0100 · TJSP · 3ª V. Cível"
          teor="Fica o réu intimado para apresentar contestação no prazo de 15 dias."
        />
        <TriageCard
          variant="concluir"
          tone="normal"
          prazo="ciência · sem prazo de resposta"
          processo="Sentença · 0009876-54.2026.8.26.0100 · TJSP"
          teor="Ciência da sentença que homologou o acordo."
        />
        <TriageCard
          variant="cumprimento"
          tone="atencao"
          prazo="vence 08/09 · em atraso 1d"
          prazoTone="atraso"
          processo="Execução de Título · 4001542-14.2026.8.26.0506 · TJSP"
          teor="Intime-se a exequente a indicar o endereço da executada Samira."
        />
        <TriageCard
          variant="revisar"
          tone="normal"
          prazo="vence 12/09"
          processo="Despacho de mero expediente · 0004321-00.2026.8.26.0100 · TJSP"
          teor="Manifeste-se a parte, no que entender de direito."
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-medium">
          Detalhe da intimação (colapsado)
        </h2>
        <IntimacaoDetalhe />
      </section>
    </div>
  );
}
