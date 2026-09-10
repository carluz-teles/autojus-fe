"use client";

import {
  ArrowLeft,
  Check,
  Circle,
  FileText,
  Loader2,
  Pause,
  Play,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Thesis } from "../../types";

const BenchPrototype = dynamic(
  () => import("./bench-prototype").then((module) => module.BenchPrototype),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8">
        Abrindo bancada…
      </p>
    ),
  },
);

const SAMPLE = [
  {
    title: "MANIFESTAÇÃO SOBRE DOCUMENTOS",
    text: "Processo demonstrativo · minuta fictícia\n\n[PARTE REPRESENTADA], por seu advogado, apresenta manifestação sobre os documentos indicados na intimação de origem, nos seguintes termos.",
  },
  {
    title: "I — Objeto da manifestação",
    text: "A presente minuta tem por objeto examinar a documentação apresentada, delimitando os pontos que dependem de esclarecimento. A análise deve permanecer restrita ao conteúdo efetivamente disponível nos autos.",
  },
  {
    title: "II — Pontos a esclarecer",
    text: "O demonstrativo utilizado neste exemplo não detalha os critérios de atualização. Antes de concluir sobre a composição do valor, é necessário conferir a memória de cálculo e os documentos de suporte.\n\n[PENDENTE: conferir os critérios e os valores no documento original.]",
  },
  {
    title: "III — Pedido",
    text: "Requer-se o esclarecimento dos pontos indicados, conforme a documentação e o objetivo confirmados pelo advogado.\n\nNestes termos, pede deferimento.\n\n[LOCAL E DATA]",
  },
];
const TEXT_LENGTH = SAMPLE.reduce(
  (total, section) => total + section.text.length,
  0,
);
const SAMPLE_HTML = SAMPLE.map(
  (section) =>
    `<h2>${section.title}</h2>${section.text
      .split("\n\n")
      .map((text) => `<p>${text}</p>`)
      .join("")}`,
).join("");
const PHASES = [
  "Organizando o contexto",
  "Conferindo as fontes",
  "Redigindo a minuta",
  "Conferindo o texto",
];
const END = 14000;

export function ConstructionPrototype({
  instructions,
  theses,
  onBack,
  onSource,
}: {
  instructions: string;
  theses: Thesis[];
  onBack: () => void;
  onSource: (id: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);
  const done = elapsed >= END;
  const writing = elapsed >= 4000;
  const phase =
    elapsed < 2000 ? 0 : elapsed < 4000 ? 1 : elapsed < 12000 ? 2 : 3;
  const visible = Math.floor(
    Math.min(1, Math.max(0, (elapsed - 4000) / 8000)) * TEXT_LENGTH,
  );

  useEffect(() => {
    if (!playing || failed || done) return;
    const timer = window.setInterval(
      () => setElapsed((value) => Math.min(END, value + 100)),
      100,
    );
    return () => window.clearInterval(timer);
  }, [playing, failed, done]);

  const retry = () => {
    setElapsed(0);
    setFailed(false);
    setPlaying(true);
  };
  const progress = (
    <ol className="flex flex-col gap-4" aria-label="Etapas demonstrativas">
      {PHASES.map((label, index) => (
        <li
          key={label}
          className="flex items-center gap-3 text-sm"
          aria-current={!done && index === phase ? "step" : undefined}
        >
          {done || index < phase ? (
            <Check aria-hidden className="text-primary size-4" />
          ) : index === phase ? (
            <Loader2
              aria-hidden
              className="text-primary size-4 motion-safe:animate-spin"
            />
          ) : (
            <Circle aria-hidden className="text-muted-foreground size-4" />
          )}
          <span
            className={
              index <= phase ? "text-foreground" : "text-muted-foreground"
            }
          >
            {label}
          </span>
          {done || index < phase ? (
            <span className="sr-only">Concluído na simulação</span>
          ) : null}
        </li>
      ))}
    </ol>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Voltar à preparação
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Tempo acelerado de demonstração — não é uma medição de IA
          </span>
          {!done && (
            <Button
              variant="outline"
              size="sm"
              disabled={failed}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? (
                <Pause data-icon="inline-start" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {playing ? "Pausar" : "Continuar"}
            </Button>
          )}
          {!done && (
            <Button
              variant="ghost"
              size="sm"
              disabled={failed}
              onClick={() => setFailed(true)}
            >
              Simular falha
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={
              done
                ? retry
                : () => {
                    setFailed(false);
                    setElapsed(END);
                  }
            }
          >
            {done ? "Rever animação" : "Ir para o editor"}
          </Button>
        </div>
      </div>
      {failed && (
        <div
          role="alert"
          className="bg-card flex flex-wrap items-center justify-between gap-3 border-b p-5"
        >
          <p>
            Não foi possível concluir a redação. Suas orientações foram
            mantidas.{" "}
            <span className="text-muted-foreground">Erro simulado.</span>
          </p>
          <Button onClick={retry}>Tentar novamente</Button>
        </div>
      )}
      {done ? (
        <BenchPrototype
          html={SAMPLE_HTML}
          instructions={instructions}
          theses={theses}
          onSource={onSource}
        />
      ) : !writing ? (
        <main className="grid flex-1 place-items-center overflow-y-auto px-6 py-12">
          <div className="flex w-full max-w-xl flex-col gap-8">
            <div className="bg-primary/5 text-primary flex size-20 items-center justify-center rounded-full border">
              <FileText aria-hidden className="size-8" />
            </div>
            <div className="flex flex-col gap-4">
              <Badge variant="outline" className="self-start">
                02 / Redação · simulação
              </Badge>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                Sua estratégia está
                <br />
                ganhando forma.
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Reunindo o contexto e os fundamentos escolhidos. Assim que a
                primeira linha estiver disponível, você acompanhará a redação na
                própria peça.
              </p>
            </div>
            <p role="status" className="text-primary text-sm">
              {failed
                ? "Simulação interrompida"
                : !playing
                  ? "Simulação pausada"
                  : PHASES[phase]}
            </p>
            {progress}
            <p className="text-muted-foreground border-t pt-5 text-xs">
              Você continua no controle. Nenhuma assinatura ou protocolo será
              realizado.
            </p>
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className="bg-muted/30 flex min-w-0 flex-col gap-5 p-4 sm:p-8"
            aria-label="Construção da peça"
          >
            <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-2xl">
                Manifestação sobre documentos
              </h1>
              <Badge variant="outline">
                {done ? "Minuta de exemplo · revise" : "Texto provisório"}
              </Badge>
            </div>
            <p
              role="status"
              className="text-muted-foreground mx-auto w-full max-w-4xl text-xs"
            >
              {failed
                ? "Redação interrompida na simulação."
                : !playing
                  ? "Simulação pausada."
                  : PHASES[phase] + "…"}
            </p>
            <article
              aria-label="Texto demonstrativo em elaboração"
              className="bg-card mx-auto min-h-[640px] w-full max-w-4xl rounded-lg border p-6 sm:p-12"
            >
              {SAMPLE.map((section, index) => {
                const offset = SAMPLE.slice(0, index).reduce(
                  (sum, item) => sum + item.text.length,
                  0,
                );
                if (visible <= offset) return null;
                return (
                  <section key={section.title} className="mb-7">
                    <h2 className="font-display mb-4 text-lg">
                      {section.title}
                    </h2>
                    <p className="font-display text-base leading-loose whitespace-pre-wrap">
                      {section.text.slice(0, Math.max(0, visible - offset))}
                    </p>
                  </section>
                );
              })}
              {phase === 2 && (
                <span
                  aria-hidden
                  className="bg-primary inline-block h-5 w-0.5 motion-safe:animate-pulse"
                />
              )}
            </article>
          </section>
          <aside
            className="bg-background flex flex-col gap-6 border-l p-5"
            aria-label="Contexto e fundamentos"
          >
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-xl">Direção da peça</h2>
              <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {instructions}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="font-medium">Fundamentos escolhidos</h2>
              {theses.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Nenhum fundamento selecionado.
                </p>
              )}
              {theses.map((thesis) => (
                <div
                  key={thesis.id}
                  className="flex flex-col gap-2 border-b pb-4"
                >
                  <p className="text-sm">{thesis.label}</p>
                  <Button
                    variant="link"
                    className="h-auto justify-start px-0 text-left whitespace-normal"
                    onClick={() => onSource(thesis.sourceDocumentId)}
                  >
                    {thesis.sourceLabel || "Consultar documento de origem"}
                  </Button>
                </div>
              ))}
            </div>
            {progress}
            <p className="text-muted-foreground text-xs leading-relaxed">
              Texto fixo e fictício: não responde às orientações digitadas. O
              protótipo demonstra a experiência, não a qualidade ou velocidade
              da geração.
            </p>
          </aside>
        </main>
      )}
    </div>
  );
}
