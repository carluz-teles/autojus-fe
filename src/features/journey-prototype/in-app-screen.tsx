"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  GitBranch,
  Info,
  Layers3,
  List,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageFrame } from "@/components/shell/page-frame";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  type DemoJourney,
  type DemoWork,
  openWorks,
  type Stage,
} from "./demo-data";
import { useInAppMock } from "./in-app-state";
import {
  BenchPreview,
  FilingPreview,
  JourneySteps,
  Overview,
  PieceCard,
} from "./journey-prototype";
import { MockTriage } from "./mock-triage";

const base = "/dev/fluxo";
const card = "bg-card shadow-surface min-w-0 rounded-xl border p-5";
const labels: Record<string, string> = {
  triagem: "Triagem",
  intimacoes: "Intimações",
  pipeline: "Providências",
  providencias: "Providência",
  fila: "Fila",
  "meus-prazos": "Meus Prazos",
  pecas: "Peça",
  protocolo: "Protocolo",
  processos: "Processos",
  calendario: "Calendário",
  notificacoes: "Notificações",
  configuracoes: "Configurações",
};
const sourceHref = (journey: DemoJourney) => `${base}/intimacoes/${journey.id}`;
const workHref = (work: DemoWork) => `${base}/providencias/${work.id}`;
const pieceHref = (work: DemoWork) => `${base}/pecas/${work.id}`;
const filingHref = (work: DemoWork) => `${base}/protocolo/${work.id}`;

export function InAppMockScreen({ screen }: { screen: string[] }) {
  const { journeys } = useInAppMock();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [area, id] = screen;
  const entry = journeys
    .flatMap((journey) => journey.works.map((work) => ({ journey, work })))
    .find(({ work }) => work.id === id);
  const journey = journeys.find((item) => item.id === id);
  const detailArea =
    ["intimacoes", "providencias", "pecas", "protocolo"].includes(area) && !!id;
  const back =
    area === "intimacoes"
      ? `${base}/intimacoes`
      : entry && ["pecas", "protocolo"].includes(area)
        ? workHref(entry.work)
        : `${base}/pipeline`;
  let content: React.ReactNode;

  if (
    screen.length > 2 ||
    (detailArea && !(area === "intimacoes" ? journey : entry))
  ) {
    content = (
      <EmptyState
        icon={Mail}
        title="Exemplo não encontrado"
        description="Este registro não faz parte da simulação."
        action={
          <MockLink href={`${base}/intimacoes`}>
            Ver intimações de exemplo
          </MockLink>
        }
      />
    );
  } else if (area === "triagem") {
    content = <MockTriage />;
  } else if (area === "intimacoes" && !id) {
    content = (
      <Overview
        compact
        journeys={journeys}
        filter={filter}
        onFilter={setFilter}
        onOpen={(item) => router.push(sourceHref(item))}
      />
    );
  } else if (area === "intimacoes" && journey) {
    content = <MockIntimation journey={journey} />;
  } else if (["pipeline", "fila", "meus-prazos"].includes(area)) {
    content = <MockWorkViews area={area} />;
  } else if (area === "providencias" && entry) {
    content = <MockWorkDetail {...entry} />;
  } else if (area === "pecas" && entry?.work.piece) {
    content = (
      <BenchPreview
        {...entry}
        showHeading={false}
        onBack={() => router.push(workHref(entry.work))}
        onSource={() => router.push(sourceHref(entry.journey))}
      />
    );
  } else if (area === "protocolo" && entry?.work.filing) {
    content = (
      <FilingPreview
        work={entry.work}
        showHeading={false}
        onBack={() => router.push(workHref(entry.work))}
        onPiece={() => router.push(pieceHref(entry.work))}
      />
    );
  } else if (area === "processos") {
    content = (
      <>
        <div className={cn(card, "divide-y p-0")}>
          {journeys.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <h2 className="text-sm font-medium">{item.title}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {item.reference} · {openWorks(item)} providência(s) em aberto
                </p>
              </div>
              <MockLink href={sourceHref(item)}>
                Ver intimação
                <ArrowUpRight data-icon="inline-end" />
              </MockLink>
            </div>
          ))}
        </div>
      </>
    );
  } else {
    content = (
      <EmptyState
        icon={Layers3}
        title={labels[area] ?? "Tela fora desta simulação"}
        description="Esta área continua no menu para avaliarmos a organização do app, mas não recebeu um mock nesta rodada. Nenhum dado real será carregado aqui."
        action={<MockLink href={`${base}/triagem`}>Voltar à triagem</MockLink>}
      />
    );
  }

  return (
    <PageFrame
      header={
        <>
          {detailArea ? (
            <Link
              href={back}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label="Voltar à lista ou providência"
            >
              <ArrowLeft aria-hidden />
            </Link>
          ) : null}
          <h1 className="shrink-0 text-[13px] font-medium">
            {id && area === "intimacoes"
              ? "Intimação"
              : (labels[area] ?? "Simulação")}
          </h1>
          {entry || journey ? (
            <span
              className="text-muted-foreground min-w-0 truncate text-xs"
              title={
                entry
                  ? `${entry.work.title} · ${entry.journey.title}`
                  : journey?.title
              }
            >
              {area === "pecas"
                ? entry?.work.piece?.title
                : (entry?.work.title ?? journey?.title)}
            </span>
          ) : null}
          <Badge variant="outline" className="ml-auto shrink-0">
            Mock · V02
          </Badge>
        </>
      }
      toolbar={
        <div className="bg-primary/5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2 text-xs">
          <span>
            <span className="font-medium">Simulação do fluxo.</span> Dados
            fictícios; nenhuma gravação real.
          </span>
          <span className="text-muted-foreground">
            A sidebar navega nos mocks · recarregar reinicia
          </span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-4 py-5 sm:px-6">
        {content}
      </div>
    </PageFrame>
  );
}

function MockLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={buttonVariants({
        variant: primary ? "default" : "outline",
        size: "sm",
      })}
    >
      {children}
    </Link>
  );
}

function MockIntimation({ journey }: { journey: DemoJourney }) {
  return (
    <>
      <dl className="grid gap-4 border-b pb-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Processo" value={journey.reference} />
        <Meta label="Publicação" value={journey.publication} />
        <Meta label="Destinatário · exemplo" value={journey.owner} />
        <Meta label="Prazo registrado" value={journey.due} />
      </dl>
      <section className={cn(card, "p-0")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <h2 className="font-display text-xl">Providências</h2>
          <Badge variant="outline">{openWorks(journey)} em aberto</Badge>
        </div>
        {journey.works.length ? (
          <div className="divide-y">
            {journey.works.map((work) => (
              <div
                key={work.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">{work.title}</h3>
                    <Badge
                      variant={
                        work.blocker
                          ? "warning"
                          : work.stage === "done"
                            ? "success"
                            : "outline"
                      }
                    >
                      {work.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {work.owner}
                    {work.piece
                      ? ` · Peça v${work.piece.version} · ${work.piece.author} · ${work.piece.editedAt}`
                      : " · Nenhuma peça vinculada"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MockLink href={workHref(work)}>Ver providência</MockLink>
                  {work.piece ? (
                    <MockLink href={pieceHref(work)}>
                      Abrir peça
                      <FileText data-icon="inline-end" />
                    </MockLink>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-muted-foreground text-sm">
              Ainda na triagem. Nenhuma providência foi criada.
            </p>
            <MockLink href={`${base}/triagem`}>Analisar na triagem</MockLink>
          </div>
        )}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className={card}>
          <h2 className="font-display text-xl">Teor da intimação</h2>
          <p className="mt-5 text-sm leading-loose">{journey.excerpt}</p>
          <p className="text-muted-foreground mt-6 text-xs">
            Publicação demonstrativa · sem valor jurídico
          </p>
        </section>
        <aside className={card}>
          <h2 className="text-sm font-medium">Decisão de triagem</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {journey.triage}
          </p>
          <Separator className="my-4" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            O estado detalhado da peça e as próximas ações ficam na providência.
            Aqui permanecem a origem e os vínculos.
          </p>
        </aside>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function MockWorkViews({ area }: { area: string }) {
  const { journeys } = useInAppMock();
  const all = journeys.flatMap((journey) =>
    journey.works.map((work) => ({ journey, work })),
  );
  const rows =
    area === "meus-prazos"
      ? all.filter(
          ({ work }) => work.owner === "Luan Gomes" && work.stage !== "done",
        )
      : all;
  const board = area === "pipeline";
  const columns = [
    { label: "A fazer", stages: ["work"] },
    { label: "Em andamento", stages: ["writing", "review", "filing"] },
    { label: "Concluídas", stages: ["done"] },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {rows.length} providências
          {area === "meus-prazos" ? " · Luan Gomes · em aberto" : ""}
        </span>
        <MockLink href={`${base}/${board ? "fila" : "pipeline"}`}>
          {board ? (
            <List data-icon="inline-start" />
          ) : (
            <Layers3 data-icon="inline-start" />
          )}
          {board ? "Ver em lista" : "Ver em quadro"}
        </MockLink>
      </div>
      {board ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {columns.map((column) => (
            <section
              key={column.label}
              className="bg-muted/30 min-w-0 rounded-xl border p-3"
            >
              <div className="mb-4 flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-medium">{column.label}</h2>
                <Badge variant="outline">
                  {
                    rows.filter(({ work }) =>
                      column.stages.includes(work.stage),
                    ).length
                  }
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                {rows
                  .filter(({ work }) => column.stages.includes(work.stage))
                  .map((entry) => (
                    <WorkRow key={entry.work.id} {...entry} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((entry) => (
            <WorkRow key={entry.work.id} {...entry} compact />
          ))}
        </div>
      )}
    </>
  );
}

function WorkRow({
  journey,
  work,
  compact = false,
}: {
  journey: DemoJourney;
  work: DemoWork;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        card,
        compact && "flex flex-wrap items-center justify-between gap-4",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              work.blocker
                ? "warning"
                : work.stage === "done"
                  ? "success"
                  : "outline"
            }
          >
            {work.status}
          </Badge>
          <span className="text-muted-foreground text-xs">{journey.due}</span>
        </div>
        <Link
          href={workHref(work)}
          className="focus-visible:ring-ring mt-3 block rounded text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {work.title}
        </Link>
        <p className="text-muted-foreground mt-2 text-xs">{journey.title}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {work.owner}
          {work.piece
            ? ` · Peça v${work.piece.version}`
            : " · Sem peça vinculada"}
        </p>
      </div>
      <div className={cn("flex flex-wrap gap-2", !compact && "mt-4")}>
        <MockLink href={workHref(work)}>Abrir</MockLink>
        {work.piece ? (
          <MockLink href={pieceHref(work)}>
            Peça
            <FileText data-icon="inline-end" />
          </MockLink>
        ) : null}
      </div>
    </article>
  );
}

function MockWorkDetail({
  journey,
  work,
}: {
  journey: DemoJourney;
  work: DemoWork;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-5">
          <Badge variant={work.blocker ? "warning" : "outline"}>
            {work.status}
          </Badge>
          <dl>
            <Meta label="Processo" value={journey.title} />
          </dl>
          <dl>
            <Meta label="Próximo responsável" value={work.owner} />
          </dl>
          <dl>
            <Meta label="Prazo vinculado" value={journey.due} />
          </dl>
        </div>
        <MockLink href={sourceHref(journey)}>
          Intimação de origem
          <Mail data-icon="inline-end" />
        </MockLink>
      </div>
      <section aria-label="Situação da providência">
        <JourneySteps work={work} inspectedStage={stage} onInspect={setStage} />
        {stage ? (
          <p role="status" className="text-muted-foreground mb-4 text-xs">
            Consulta de etapa:{" "}
            {
              {
                received: "recebimento da publicação",
                analysis: "análise registrada",
                work: "definição das providências",
                writing: "elaboração da peça",
                review: "revisão do advogado",
                filing: "protocolo no tribunal",
                done: "cumprimento registrado",
              }[stage]
            }
            . O estado atual continua: {work.status.toLowerCase()}.
          </p>
        ) : null}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Próximo passo
            </p>
            <h2 className="font-display mt-2 text-xl">{work.status}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {work.explanation}
            </p>
            {work.blocker ? (
              <Alert className="mt-4">
                <Info aria-hidden />
                <AlertTitle>Pendência a resolver</AlertTitle>
                <AlertDescription>{work.blocker}</AlertDescription>
              </Alert>
            ) : null}
            {work.piece || work.filing ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <MockLink
                  href={work.filing ? filingHref(work) : pieceHref(work)}
                  primary
                >
                  {work.next}
                  <ArrowUpRight data-icon="inline-end" />
                </MockLink>
              </div>
            ) : null}
          </section>
          {work.piece ? (
            <PieceCard
              work={work}
              onOpen={() => router.push(pieceHref(work))}
            />
          ) : null}
          {journey.works.length > 1 ? (
            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <GitBranch aria-hidden className="size-4" />
                Também nesta intimação
              </h2>
              {journey.works
                .filter((item) => item.id !== work.id)
                .map((item) => (
                  <div
                    key={item.id}
                    className="mt-4 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm">{item.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {item.owner} · {item.status}
                      </p>
                    </div>
                    <MockLink href={workHref(item)}>Ver providência</MockLink>
                  </div>
                ))}
            </section>
          ) : null}
        </div>
        <aside className={card}>
          <h2 className="text-sm font-medium">Histórico da providência</h2>
          <ol className="mt-4 flex flex-col gap-5">
            {work.events.map((event) => (
              <li key={event.title}>
                <p className="text-muted-foreground text-xs">{event.at}</p>
                <h3 className="mt-1 text-sm font-medium">{event.title}</h3>
                <p className="text-primary mt-1 text-xs">{event.actor}</p>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {event.detail}
                </p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
