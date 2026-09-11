"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  GitBranch,
  Inbox,
  Layers3,
  ListFilter,
  LockKeyhole,
  MessageSquare,
  PanelLeft,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import {
  type DemoJourney,
  demoJourneys,
  type DemoWork,
  journeyStatus,
  openWorks,
  type Stage,
} from "./demo-data";

const stages = [
  { id: "received", label: "Recebimento", icon: Inbox },
  { id: "analysis", label: "Análise", icon: Scale },
  { id: "work", label: "Providências", icon: ClipboardList },
  { id: "writing", label: "Elaboração", icon: FileText },
  { id: "review", label: "Revisão", icon: ShieldCheck },
  { id: "filing", label: "Protocolo", icon: FileCheck2 },
] as const;

const eyebrow =
  "text-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]";
const panel = "bg-card shadow-surface min-w-0 rounded-xl border";

/** Dev-only UX sandbox. No API, AI, storage or court operations. */
export function JourneyPrototype() {
  const [view, updateView] = useState<
    "overview" | "journey" | "bench" | "filing"
  >("journey");
  const [journeyId, setJourneyId] = useState("review");
  const [workId, setWorkId] = useState("manifestation");
  const [section, setSection] = useState("journey");
  const [inspectedStage, setInspectedStage] = useState<Stage | null>(null);
  const [filter, setFilter] = useState("all");
  const journey = demoJourneys.find((item) => item.id === journeyId)!;
  const work =
    journey.works.find((item) => item.id === workId) ?? journey.works[0];

  function setView(next: typeof view) {
    updateView(next);
    window.scrollTo({ top: 0 });
  }

  function openJourney(item: DemoJourney) {
    setJourneyId(item.id);
    setWorkId(item.works[0]?.id ?? "");
    setInspectedStage(null);
    setSection("journey");
    setView("journey");
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-card/95 sticky top-0 z-20 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-8">
          <span className="flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg font-serif text-xl">
              A
            </span>
            <span className="font-display text-xl">Atjus</span>
          </span>
          <span className="bg-border hidden h-5 w-px sm:block" aria-hidden />
          <span className="text-muted-foreground hidden text-xs sm:block">
            Escritório demonstrativo
          </span>
          <Badge variant="outline" className="ml-auto">
            Protótipo · V01
          </Badge>
          <span className="text-muted-foreground w-full text-xs sm:w-auto">
            Dados fictícios · nenhuma ação real
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <nav
          aria-label="Navegação do protótipo"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <Button variant="ghost" size="sm" onClick={() => setView("overview")}>
            {view === "overview" ? (
              <Layers3 data-icon="inline-start" />
            ) : (
              <ArrowLeft data-icon="inline-start" />
            )}
            Acompanhamento
          </Button>
          {view !== "overview" ? (
            <>
              <ChevronRight
                aria-hidden
                className="text-muted-foreground size-3"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("journey")}
              >
                Jornada da intimação
              </Button>
            </>
          ) : null}
          {view === "bench" ? (
            <>
              <ChevronRight
                aria-hidden
                className="text-muted-foreground size-3"
              />
              <span>Peça · v{work?.piece?.version}</span>
            </>
          ) : null}
        </nav>

        {view === "overview" ? (
          <Overview filter={filter} onFilter={setFilter} onOpen={openJourney} />
        ) : view === "filing" && work?.filing ? (
          <FilingPreview
            work={work}
            onBack={() => setView("journey")}
            onPiece={() => setView("bench")}
          />
        ) : view === "bench" && work?.piece ? (
          <BenchPreview
            journey={journey}
            work={work}
            onBack={() => setView("journey")}
            onSource={() => {
              setSection("source");
              setView("journey");
            }}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <p className={eyebrow}>
                  Uma intimação. Todo o trabalho conectado.
                </p>
                <h1 className="font-display mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
                  {journey.title}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  {journey.reference} <span aria-hidden>·</span>{" "}
                  {journey.subject}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <Datum
                  label="Responsável pela intimação"
                  value={journey.owner}
                />
                <Datum label="Prazo registrado · exemplo" value={journey.due} />
              </div>
            </div>

            <Tabs
              defaultValue="journey"
              value={section}
              onValueChange={setSection}
            >
              <TabsList aria-label="Contexto da intimação">
                <TabsTrigger value="journey">
                  Jornada e próximos passos
                </TabsTrigger>
                <TabsTrigger value="source">Intimação de origem</TabsTrigger>
              </TabsList>
              <TabsContent value="journey" className="mt-5">
                <section
                  aria-label="Percurso do trabalho"
                  className="mb-5 border-b pb-1"
                >
                  <p className={eyebrow}>
                    {work
                      ? `Percurso da providência · ${work.title}`
                      : "O caminho a partir daqui"}
                  </p>
                  <JourneySteps
                    work={work}
                    inspectedStage={inspectedStage}
                    onInspect={setInspectedStage}
                  />
                  {inspectedStage ? (
                    <div className="mb-4">
                      <StageExplanation
                        stage={inspectedStage}
                        journey={journey}
                        work={work}
                      />
                    </div>
                  ) : null}
                </section>
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="flex min-w-0 flex-col gap-5">
                    <section
                      className={cn(panel, "overflow-hidden")}
                      aria-label="Próximo passo da intimação"
                    >
                      <div className="bg-primary/5 flex flex-wrap items-center gap-2 border-b px-5 py-3 text-xs">
                        <CheckCheck
                          aria-hidden
                          className="text-primary size-4"
                        />
                        <span>
                          {journey.works.length
                            ? "Triagem concluída · o acompanhamento continua aqui"
                            : "Recebida · aguardando análise na triagem"}
                        </span>
                        <span className="text-muted-foreground ml-auto">
                          {journey.works.length
                            ? `${openWorks(journey)} providência(s) em aberto`
                            : "Nenhuma providência criada"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-5 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-col gap-2">
                            <span className={eyebrow}>
                              Agora · {work?.owner ?? journey.owner}
                            </span>
                            <h2 className="font-display text-2xl">
                              {work?.status ?? "Analisar a intimação"}
                            </h2>
                          </div>
                          <Button
                            onClick={() =>
                              work?.filing
                                ? setView("filing")
                                : work?.piece
                                  ? setView("bench")
                                  : setInspectedStage(work?.stage ?? "analysis")
                            }
                          >
                            {work?.next ?? "Ver análise"}
                            <ArrowUpRight data-icon="inline-end" />
                          </Button>
                        </div>
                        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                          {work?.explanation ??
                            "Confira o teor, revise o tipo do ato e o prazo, e defina se há trabalho a realizar. Sair da triagem deve deixar um destino explícito."}
                        </p>
                        {work?.blocker ? (
                          <Alert
                            variant={
                              work.filing === "uncertain"
                                ? "destructive"
                                : "default"
                            }
                          >
                            <TriangleAlert aria-hidden />
                            <AlertTitle>
                              O que impede o próximo passo
                            </AlertTitle>
                            <AlertDescription>{work.blocker}</AlertDescription>
                          </Alert>
                        ) : null}
                        {!work?.blocker &&
                        journey.works.some((item) => item.blocker) ? (
                          <div className="flex items-start gap-2 text-sm">
                            <GitBranch
                              aria-hidden
                              className="text-gold-foreground mt-0.5 size-4 shrink-0"
                            />
                            <p>
                              <span className="font-medium">
                                Uma pendência em paralelo.
                              </span>{" "}
                              A peça pode ser revisada, mas ainda falta um
                              documento para concluir o envio.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </section>

                    {journey.works.length ? (
                      <section
                        aria-label="Providências vinculadas"
                        className={panel}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
                          <h2 className="text-sm font-medium">
                            Providências desta intimação
                          </h2>
                          <span className="text-muted-foreground text-xs">
                            Selecione para acompanhar
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 p-2 pt-3">
                          {journey.works.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={work?.id === item.id}
                              onClick={() => {
                                setWorkId(item.id);
                                setInspectedStage(null);
                              }}
                              className={cn(
                                "focus-visible:ring-ring flex min-w-0 flex-wrap items-center gap-3 rounded-lg p-3 text-left transition-colors outline-none focus-visible:ring-2",
                                work?.id === item.id
                                  ? "bg-primary/5"
                                  : "hover:bg-muted/60",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-8 shrink-0 place-items-center rounded-lg",
                                  work?.id === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {item.piece ? (
                                  <FileText aria-hidden className="size-4" />
                                ) : (
                                  <ClipboardList
                                    aria-hidden
                                    className="size-4"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">
                                  {item.title}
                                </span>
                                <span className="text-muted-foreground mt-1 block text-xs">
                                  {item.owner} ·{" "}
                                  {item.piece
                                    ? `Peça v${item.piece.version} vinculada`
                                    : "Sem peça própria"}
                                </span>
                              </span>
                              <Badge
                                variant={
                                  item.blocker
                                    ? "warning"
                                    : item.stage === "done"
                                      ? "success"
                                      : "outline"
                                }
                              >
                                {item.status}
                              </Badge>
                              <ChevronRight
                                aria-hidden
                                className="text-muted-foreground size-4"
                              />
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section
                      aria-label="Registro vinculado ao trabalho"
                      className="min-w-0"
                    >
                      {work?.piece ? (
                        <PieceCard
                          work={work}
                          onOpen={() => setView("bench")}
                        />
                      ) : (
                        <StageExplanation
                          stage={work?.stage ?? "analysis"}
                          journey={journey}
                          work={work}
                        />
                      )}
                    </section>
                  </div>

                  <aside
                    className="flex min-w-0 flex-col gap-5"
                    aria-label="Contexto e histórico conectado"
                  >
                    <section className={cn(panel, "p-5")}>
                      <p className={eyebrow}>De onde veio</p>
                      <h2 className="mt-3 text-sm font-medium">
                        Intimação de {journey.publication}
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        {journey.excerpt}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-3"
                        onClick={() => setSection("source")}
                      >
                        Consultar origem
                        <ArrowUpRight data-icon="inline-end" />
                      </Button>
                      <Separator className="my-4" />
                      <div className="flex items-start gap-2 text-xs leading-relaxed">
                        <Check
                          aria-hidden
                          className="text-primary mt-0.5 size-3 shrink-0"
                        />
                        <p>{journey.triage}</p>
                      </div>
                    </section>
                    <section className={cn(panel, "p-5")}>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-medium">
                          O caminho até aqui
                        </h2>
                        <Clock3
                          aria-hidden
                          className="text-muted-foreground size-4"
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {work?.title ?? "Recebimento da intimação"}
                      </p>
                      <ol className="mt-5 flex flex-col">
                        {(
                          work?.events ?? [
                            {
                              title: "Intimação recebida",
                              actor: "Captura automática",
                              at: "09 set · 08:00",
                              detail:
                                "Encaminhada à triagem. Análise humana pendente.",
                            },
                          ]
                        ).map((event, index) => (
                          <li
                            key={event.title}
                            className="relative pb-5 pl-5 last:pb-0"
                          >
                            {index < (work?.events.length ?? 1) - 1 ? (
                              <span
                                aria-hidden
                                className="bg-border absolute top-2 bottom-0 left-[3px] w-px"
                              />
                            ) : null}
                            <span
                              aria-hidden
                              className={cn(
                                "absolute top-1.5 left-0 size-[7px] rounded-full",
                                index === 0 ? "bg-primary" : "bg-border",
                              )}
                            />
                            <p className="text-muted-foreground text-[10px] tabular-nums">
                              {event.at}
                            </p>
                            <h3 className="mt-1 text-xs font-medium">
                              {event.title}
                            </h3>
                            <p className="text-primary mt-1 text-xs">
                              {event.actor}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              {event.detail}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </section>
                  </aside>
                </div>
              </TabsContent>
              <TabsContent value="source" className="mt-5">
                <SourcePreview
                  journey={journey}
                  onBack={() => setSection("journey")}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
        <footer className="text-muted-foreground flex flex-wrap justify-between gap-2 border-t pt-4 text-xs">
          <span>
            Laboratório de jornada · proposta de navegação, não um novo fluxo em
            produção.
          </span>
          <span>Sem IA, ciência, confirmação de prazo ou protocolo.</span>
        </footer>
      </main>
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <dl className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </dl>
  );
}

export function Overview({
  filter,
  onFilter,
  onOpen,
  journeys = demoJourneys,
  compact = false,
}: {
  filter: string;
  onFilter: (value: string) => void;
  onOpen: (journey: DemoJourney) => void;
  journeys?: DemoJourney[];
  compact?: boolean;
}) {
  const matches = (item: DemoJourney, value: string) =>
    value === "all" ||
    (value === "review" &&
      item.works.some((work) => work.stage === "review")) ||
    (value === "attention" && item.works.some((work) => work.blocker)) ||
    (value === "done" && item.works.length > 0 && !openWorks(item));
  const visible = journeys.filter((item) => matches(item, filter));
  return (
    <>
      {!compact ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>
              {compact
                ? "Acervo · todas as publicações"
                : "Da entrada ao desfecho"}
            </p>
            <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
              {compact ? "Intimações" : "O trabalho não some da vista."}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              {compact
                ? "Consulte a publicação, o trabalho em aberto e as peças produzidas. A intimação continua aqui depois da triagem."
                : "A triagem é só o começo. Veja onde cada intimação está, quem conduz o próximo passo e quais peças já existem."}
            </p>
          </div>
          <span className="text-muted-foreground text-xs">
            {journeys.length} registros demonstrativos · 09 set 2026
          </span>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
        {[
          {
            label: "Ainda na triagem",
            value: journeys.filter((item) => !item.works.length).length,
            note: "aguardando análise",
          },
          {
            label: "Em acompanhamento",
            value: journeys.filter((item) => openWorks(item) > 0).length,
            note: "trabalho em aberto",
          },
          {
            label: "Com peça vinculada",
            value: journeys.filter((item) =>
              item.works.some((work) => work.piece),
            ).length,
            note: "versão e autoria à vista",
          },
          {
            label: "Jornada concluída",
            value: journeys.filter(
              (item) => item.works.length && !openWorks(item),
            ).length,
            note: "cumprimento registrado",
          },
        ].map((item) => (
          <div key={item.label}>
            <p className={eyebrow}>{item.label}</p>
            <p className="font-display mt-2 text-3xl">
              {String(item.value).padStart(2, "0")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{item.note}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="all" value={filter} onValueChange={onFilter}>
        <TabsList aria-label="Filtrar jornadas">
          {[
            { id: "all", label: "Todas" },
            { id: "review", label: "Em revisão" },
            { id: "attention", label: "Com pendência" },
            { id: "done", label: "Concluídas" },
          ].map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}{" "}
              <span className="text-muted-foreground ml-1">
                {journeys.filter((journey) => matches(journey, item.id)).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter} className="mt-4">
          <div className={cn(panel, "overflow-hidden")}>
            <div className="text-muted-foreground bg-muted/30 hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-5 border-b px-5 py-3 text-xs lg:grid">
              <span>Intimação / processo</span>
              <span>Onde está · próximo responsável</span>
              <span>Peça vinculada</span>
              <span>Prazo</span>
            </div>
            <ul className="divide-y">
              {visible.map((item) => {
                const piece = item.works.find((work) => work.piece)?.piece;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="hover:bg-primary/3 focus-visible:ring-ring grid w-full gap-4 p-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_100px] lg:gap-5"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="text-muted-foreground mt-1.5 block text-xs">
                          {item.reference}
                        </span>
                        <span className="text-muted-foreground mt-1.5 block text-xs">
                          {item.works.length} providência(s) · {openWorks(item)}{" "}
                          em aberto
                        </span>
                      </span>
                      <span className="flex flex-col items-start gap-2">
                        <Badge
                          variant={
                            item.works.some((work) => work.blocker)
                              ? "warning"
                              : item.works.length && !openWorks(item)
                                ? "success"
                                : "outline"
                          }
                        >
                          {journeyStatus(item)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {item.works[0]?.owner ?? item.owner}
                        </span>
                        <span className="text-xs">
                          {item.id === "review"
                            ? "+ 1 documento pendente em paralelo"
                            : (item.works[0]?.next ??
                              "Analisar e definir o trabalho")}
                        </span>
                      </span>
                      <span className="flex min-w-0 gap-2">
                        <FileText
                          aria-hidden
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        />
                        <span>
                          {piece ? (
                            <>
                              <span className="block text-sm">
                                {piece.title}{" "}
                                <span className="text-muted-foreground">
                                  · v{piece.version}
                                </span>
                              </span>
                              <span className="text-muted-foreground mt-1.5 block text-xs">
                                {piece.author} · {piece.editedAt}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {item.works.length
                                ? "Não exige peça"
                                : "Ainda não há peça"}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex items-start justify-between gap-2 text-sm">
                        <span>{item.due}</span>
                        <ArrowUpRight
                          aria-hidden
                          className="text-muted-foreground size-4 shrink-0"
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
            <ListFilter aria-hidden className="size-3" />
            Filtros mudam a visão. A intimação e seu histórico continuam sendo
            os mesmos.
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}

export function JourneySteps({
  work,
  inspectedStage,
  onInspect,
}: {
  work?: DemoWork;
  inspectedStage: Stage | null;
  onInspect: (stage: Stage) => void;
}) {
  const path =
    work && !work.piece
      ? [
          ...stages.slice(0, 3),
          { id: "done" as const, label: "Cumprimento", icon: CircleCheck },
        ]
      : stages;
  const current = work?.stage ?? "analysis";
  const currentIndex = path.findIndex((step) => step.id === current);
  return (
    <ol
      className="my-5 grid grid-cols-2 gap-2 sm:flex sm:gap-0"
      aria-label="Etapas da providência selecionada"
    >
      {path.map((step, index) => {
        const complete = index < currentIndex || current === "done";
        const active = current === step.id && current !== "done";
        const Icon = complete ? Check : step.icon;
        return (
          <li key={step.id} className="relative min-w-0 flex-1">
            {index < path.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 right-0 left-8 hidden h-px sm:block",
                  complete ? "bg-primary/30" : "bg-border",
                )}
              />
            ) : null}
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              aria-pressed={inspectedStage === step.id}
              onClick={() => onInspect(step.id)}
              className="focus-visible:ring-ring relative flex w-full flex-col items-start gap-2 rounded-lg p-1 text-left outline-none focus-visible:ring-2"
            >
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-full border",
                  complete
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : active
                      ? "border-primary bg-primary text-primary-foreground ring-primary/10 ring-4"
                      : "bg-card text-muted-foreground",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
              </span>
              <span
                className={cn(
                  "text-xs",
                  active || inspectedStage === step.id
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {complete
                  ? step.id === "work"
                    ? "Definidas"
                    : "Concluída"
                  : active
                    ? "Você está aqui"
                    : "A seguir"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StageExplanation({
  stage,
  journey,
  work,
}: {
  stage: Stage;
  journey: DemoJourney;
  work?: DemoWork;
}) {
  const texts: Record<Stage, { title: string; text: string }> = {
    received: {
      title: "A origem permanece acessível",
      text: `Publicação de ${journey.publication}. O teor, a fonte e os destinatários acompanham o trabalho até o desfecho.`,
    },
    analysis: {
      title: "Da triagem para o acompanhamento",
      text: journey.triage,
    },
    work: {
      title: work?.title ?? "Definir as providências",
      text: work
        ? `${work.owner} · ${work.explanation}`
        : "Depois da análise, o advogado decide quais providências criar ou registra que não há ação necessária. Uma sugestão de IA não é trabalho aceito.",
    },
    writing: {
      title: "Elaboração da peça",
      text: work?.piece
        ? `Minuta gerada com IA, solicitada por ${work.piece.author}, em ${work.piece.generatedAt}. Última edição: ${work.piece.editedAt}. A versão atual é a v${work.piece.version}.`
        : "Esta etapa só existe quando uma providência exige peça. Ainda não há minuta nem autoria registrada.",
    },
    review: {
      title: "Revisão pelo advogado",
      text:
        work?.stage === "filing"
          ? `Versão ${work.piece?.version} revisada por ${work.piece?.reviewer}. A liberação para preparação não equivale a protocolo.`
          : `A revisão de conteúdo e fundamentos cabe a ${work?.piece?.reviewer ?? journey.owner}. A geração da minuta não representa aprovação.`,
    },
    filing: {
      title: work?.filing ? work.status : "Protocolo ainda não iniciado",
      text: work?.filing
        ? work.explanation
        : "Depois da revisão, conferir documentos e pendências, preparar o envio e obter a confirmação do tribunal. Rascunho, tentativa e protocolo confirmado são estados diferentes.",
    },
    done: {
      title: "Cumprimento registrado",
      text:
        work?.explanation ??
        "A conclusão precisa de um registro do que foi feito, por quem e quando.",
    },
  };
  const content = texts[stage];
  return (
    <div className="bg-muted/40 rounded-lg border p-4" aria-live="polite">
      <p className={eyebrow}>Detalhe da etapa · somente leitura</p>
      <h3 className="mt-2 text-sm font-medium">{content.title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {content.text}
      </p>
    </div>
  );
}

export function PieceCard({
  work,
  onOpen,
}: {
  work: DemoWork;
  onOpen: () => void;
}) {
  if (!work.piece) return null;
  const piece = work.piece;
  return (
    <div className="bg-muted/25 rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="bg-card text-primary grid size-10 shrink-0 place-items-center rounded-lg border">
            <FileText aria-hidden className="size-5" />
          </span>
          <div>
            <p className={eyebrow}>Peça vinculada · versão atual</p>
            <h3 className="mt-1 text-sm font-medium">{piece.title}</h3>
          </div>
        </div>
        <Badge variant="outline">v{piece.version}</Badge>
      </div>
      <div className="my-5 grid gap-4 sm:grid-cols-3">
        <Datum label="Gerada com IA por solicitação de" value={piece.author} />
        <Datum label="Primeira geração" value={piece.generatedAt} />
        <Datum label="Última edição" value={piece.editedAt} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <UserRound aria-hidden className="size-3.5" />
          Revisão: {piece.reviewer}
        </span>
        <Button variant="outline" size="sm" onClick={onOpen}>
          Abrir peça
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function SourcePreview({
  journey,
  onBack,
}: {
  journey: DemoJourney;
  onBack: () => void;
}) {
  return (
    <section className={cn(panel, "mx-auto max-w-4xl p-5 sm:p-8")}>
      <p className={eyebrow}>Documento demonstrativo · sem valor jurídico</p>
      <h2 className="font-display mt-3 text-2xl">Intimação de origem</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {journey.title} · {journey.reference}
      </p>
      <div className="my-6 grid gap-5 sm:grid-cols-3">
        <Datum label="Publicação" value={journey.publication} />
        <Datum label="Destinatário · exemplo" value={journey.owner} />
        <Datum
          label="Vínculos preservados"
          value={`${journey.works.length} providência(s)`}
        />
      </div>
      <Separator />
      <blockquote className="font-display my-8 text-xl leading-relaxed">
        “{journey.excerpt}”
      </blockquote>
      <p className="text-muted-foreground mb-5 text-sm">{journey.triage}</p>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        Voltar ao mesmo trabalho
      </Button>
    </section>
  );
}

export function FilingPreview({
  work,
  onBack,
  onPiece,
  showHeading = true,
}: {
  work: DemoWork;
  onBack: () => void;
  onPiece: () => void;
  showHeading?: boolean;
}) {
  const confirmed = work.filing === "confirmed";
  const uncertain = work.filing === "uncertain";
  return (
    <section
      className={cn(
        panel,
        "mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-8",
      )}
    >
      {showHeading ? (
        <div>
          <p className={eyebrow}>Protocolo · cenário demonstrativo</p>
          <h1 className="font-display mt-2 text-3xl">{work.status}</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {work.explanation}
          </p>
        </div>
      ) : null}
      <Alert variant={uncertain ? "destructive" : "default"}>
        {confirmed ? (
          <CircleCheck aria-hidden />
        ) : (
          <TriangleAlert aria-hidden />
        )}
        <AlertTitle>
          {confirmed
            ? "Recebimento confirmado · exemplo"
            : uncertain
              ? "Envio incerto não autoriza reenviar"
              : "Rascunho não é protocolo"}
        </AlertTitle>
        <AlertDescription>
          {work.blocker ??
            (confirmed
              ? "Este comprovante é fictício e serve apenas para testar a apresentação do desfecho."
              : "Nenhum envio foi realizado. O prazo não deve ser considerado cumprido pela existência de um rascunho.")}
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 sm:grid-cols-2">
        <Datum
          label="Peça vinculada"
          value={`${work.piece?.title} · v${work.piece?.version}`}
        />
        <Datum
          label="Revisada por"
          value={work.piece?.reviewer ?? work.owner}
        />
        <Datum
          label="Situação no tribunal"
          value={
            confirmed
              ? "Recebimento confirmado"
              : uncertain
                ? "Aguardando confirmação"
                : "Rascunho · não enviado"
          }
        />
        <Datum
          label="Comprovante"
          value={confirmed ? "DEMO-RECIBO-006 · fictício" : "Não disponível"}
        />
      </div>
      <Separator />
      <p className="text-muted-foreground text-sm">
        {confirmed
          ? "A peça, o comprovante e o registro de conclusão permanecem acessíveis nesta mesma jornada."
          : "A jornada permanece aberta até a confirmação do recebimento e a conclusão das providências aplicáveis."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Voltar à providência
        </Button>
        <Button variant="outline" onClick={onPiece}>
          Consultar peça
          <FileText data-icon="inline-end" />
        </Button>
      </div>
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <LockKeyhole aria-hidden className="size-3.5" />
        Sem conexão com o tribunal. Envio e reenvio indisponíveis neste
        protótipo.
      </p>
    </section>
  );
}

export function BenchPreview({
  journey,
  work,
  onBack,
  onSource,
  showHeading = true,
}: {
  journey: DemoJourney;
  work: DemoWork;
  onBack: () => void;
  onSource: () => void;
  showHeading?: boolean;
}) {
  const piece = work.piece!;
  return (
    <>
      {showHeading ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={eyebrow}>Peça · revisão</p>
            <h1 className="font-display mt-2 text-2xl sm:text-3xl">
              {piece.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {journey.title} · {work.title}
            </p>
          </div>
          <Badge variant="outline">
            {work.status} · v{piece.version}
          </Badge>
        </div>
      ) : null}
      <section
        className="bg-primary/5 border-primary/15 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
        aria-label="Contexto persistente da jornada"
      >
        <div className="flex items-start gap-3">
          <GitBranch
            aria-hidden
            className="text-primary mt-0.5 size-4 shrink-0"
          />
          <div>
            {!showHeading ? (
              <Badge variant="outline" className="mb-2">
                {work.status} · v{piece.version}
              </Badge>
            ) : null}
            <p className="text-sm font-medium">
              Vinculada à intimação de origem.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Revisão: {piece.reviewer} · Prazo: {journey.due} ·{" "}
              {openWorks(journey)} providência(s) em aberto
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Ver providência
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <aside className={cn(panel, "flex flex-col gap-5 p-5")}>
          <div className="flex items-center gap-2">
            <PanelLeft aria-hidden className="text-primary size-4" />
            <h2 className="text-sm font-medium">Fontes e contexto</h2>
          </div>
          <Datum label="Origem" value={`Intimação · ${journey.publication}`} />
          <Button variant="outline" size="sm" onClick={onSource}>
            Consultar intimação
            <ArrowUpRight data-icon="inline-end" />
          </Button>
          <Separator />
          <Datum label="Elaboração" value={piece.author} />
          <Datum label="Gerada em" value={piece.generatedAt} />
          <Datum label="Última edição" value={piece.editedAt} />
          <p className="text-muted-foreground text-xs leading-relaxed">
            A origem, a autoria e a versão acompanham a peça. Não é necessário
            procurar em outra lista.
          </p>
        </aside>
        <article className="bg-card shadow-surface min-w-0 rounded-lg border px-6 py-10 sm:px-10">
          <p className="text-muted-foreground text-center text-[10px] tracking-widest uppercase">
            Minuta demonstrativa · leitura
          </p>
          <h2 className="font-display mt-10 text-center text-xl">
            Manifestação sobre documentos
          </h2>
          <div className="mt-8 flex flex-col gap-6 font-serif text-base leading-loose">
            <p>
              A parte autora, já qualificada no processo demonstrativo,
              apresenta manifestação sobre a documentação indicada na intimação
              de origem.
            </p>
            <section>
              <h3 className="mb-2 font-semibold">I. Objeto da manifestação</h3>
              <p>
                Esta prévia ilustra a continuidade entre a intimação recebida, a
                providência definida e a peça em elaboração. O conteúdo não foi
                gerado a partir de autos reais.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">II. Documentos a conferir</h3>
              <p>
                A revisão deve verificar os documentos vinculados e as
                pendências antes da preparação do envio. A existência de uma
                minuta não comprova o cumprimento da providência.
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-semibold">
                III. Revisão e encaminhamento
              </h3>
              <p>
                O advogado revisa os fundamentos, ajusta os pedidos e decide
                sobre o envio. A confirmação de protocolo permanece um registro
                distinto.
              </p>
            </section>
            <p className="mt-5 text-center">
              Documento fictício, sem assinatura e sem protocolo.
            </p>
          </div>
        </article>
        <aside className="flex min-w-0 flex-col gap-4">
          <section className={cn(panel, "p-5")}>
            <div className="flex items-center gap-2">
              <MessageSquare aria-hidden className="text-primary size-4" />
              <h2 className="text-sm font-medium">Assistente da peça</h2>
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              O assistente permanece ao lado da folha. Esta proposta acrescenta
              contexto de jornada, sem substituir a bancada existente.
            </p>
            <div className="mt-5 flex items-start gap-2 text-xs leading-relaxed">
              <Sparkles
                aria-hidden
                className="text-primary mt-0.5 size-4 shrink-0"
              />
              <p>
                Ao voltar, você encontra a mesma intimação, providência e
                versão.
              </p>
            </div>
          </section>
          <section className={cn(panel, "p-5")}>
            <LockKeyhole
              aria-hidden
              className="text-muted-foreground mb-3 size-4"
            />
            <h2 className="text-sm font-medium">Somente navegação</h2>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Revisar, aprovar, editar e enviar estão fora deste protótipo.
              Nenhuma ação real será executada.
            </p>
          </section>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            Voltar à providência
          </Button>
        </aside>
      </div>
    </>
  );
}
