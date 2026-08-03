import { CheckCircle2, Sparkles, Unlink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Prévia (layout de referência) — a TELA-ALMA do AtJud: a IA lê a intimação,
// explica ("o que aconteceu / o que fazer") e sugere ações que viram tarefas com
// PRAZO (derivado da lib/calendar). Adaptada do print "Justin-e" do ADVBOX.
// Dados são exemplo até DJEN (intimação) + worker-ai (análise) alimentarem.
const ACOES = [
  {
    titulo: "Diligência",
    desc: "Acessar a certidão do oficial de justiça no portal e-SAJ.",
    inicio: "05/08/2026",
    fim: "18/08/2026",
    confianca: 50,
  },
  {
    titulo: "Reanálise de peças processuais",
    desc: "Analisar o conteúdo da certidão e identificar a providência cabível.",
    inicio: "05/08/2026",
    fim: "18/08/2026",
    confianca: 50,
  },
  {
    titulo: "Cumprimento de sentença",
    desc: "Protocolar manifestação nos autos no prazo de 10 dias.",
    inicio: "05/08/2026",
    fim: "18/08/2026",
    confianca: 50,
  },
];

export default async function IntimacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="reveal grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
      {/* Coluna principal — análise da IA */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-gold/15 text-gold flex size-9 items-center justify-center rounded-full">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                Assistente IA <Badge variant="outline">IA</Badge>
              </p>
              <p className="text-muted-foreground text-xs">
                Analisou a intimação #{id}
              </p>
            </div>
          </div>
          <Badge variant="outline">Prévia</Badge>
        </div>

        <Section title="O que aconteceu">
          Intimação ao exequente, em cumprimento de sentença fundado em nota
          promissória, para que se manifeste sobre a certidão lavrada pelo
          oficial de justiça no prazo de 10 dias. A ausência de manifestação
          poderá acarretar a extinção do feito e seu arquivamento.
        </Section>

        <Section title="O que fazer" accent>
          A parte exequente deve acessar a certidão no portal e-SAJ e apresentar
          manifestação nos autos dentro do prazo, indicando concordância,
          impugnação ou requerimento de novas diligências, para evitar a
          paralisação do feito.
        </Section>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium">
              {ACOES.length} ações sugeridas com base no histórico do escritório
            </h2>
            <div className="flex items-center gap-3">
              <div className="bg-muted text-muted-foreground inline-flex rounded-md p-0.5 text-xs">
                <span className="bg-card rounded px-2 py-1 font-medium shadow-sm">
                  Dias úteis
                </span>
                <span className="px-2 py-1">Dias corridos</span>
              </div>
              <Button size="sm">
                <CheckCircle2 className="size-4" /> Aprovar tudo
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {ACOES.map((a) => (
              <div key={a.titulo} className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{a.titulo}</h3>
                  <span className="text-gold text-xs font-medium tabular-nums">
                    {a.confianca}% confiança
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  {a.inicio} → {a.fim} · prazo via calendário forense
                </p>
                <p className="bg-muted/50 text-foreground/80 mt-3 rounded-lg px-3 py-2 text-sm">
                  {a.desc}
                </p>
                <Button className="mt-3 w-full" variant="secondary" disabled>
                  Criar tarefa
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" disabled>
              Refinar análise
            </Button>
          </div>
        </div>
      </div>

      {/* Rail — metadados do processo */}
      <aside className="flex flex-col gap-4 text-sm">
        <div className="bg-card rounded-xl border p-4">
          <Meta label="Processo">
            <span className="tabular-nums">0005746-66.2025.8.26.0196</span>
          </Meta>
          <Link
            href="/processos/1"
            className="text-gold text-xs underline-offset-4 hover:underline"
          >
            Visualizar processo
          </Link>
          <Meta label="Partes envolvidas" className="mt-4">
            Paulo da Silva Prolheti Franca ME
            <span className="text-muted-foreground"> vs </span>
            Thayla Lais Carmozine
          </Meta>
          <Meta label="Grupo de ação" className="mt-4">
            Cível
          </Meta>
          <Meta label="Tipo de ação" className="mt-4">
            Execução de título extrajudicial
          </Meta>
          <Meta label="Responsável" className="mt-4">
            Ana Beatriz dos Anjos de Oliveira
          </Meta>
        </div>
        <Button variant="outline" className="w-full" disabled>
          <Unlink className="size-4" /> Desvincular processo
        </Button>
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <p
        className={cn(
          "text-foreground/80 mt-2 rounded-xl border p-4 text-sm leading-relaxed",
          accent ? "border-gold/30 bg-gold/5" : "bg-card",
        )}
      >
        {children}
      </p>
    </div>
  );
}

function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}
