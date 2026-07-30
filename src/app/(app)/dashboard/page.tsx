import { CalendarClock, FileText, Inbox, Scale } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { cn } from "@/lib/utils";

// Cards de resumo (placeholders até a FE-2 ligar no BE). Layout bento leve.
const STATS = [
  {
    label: "Processos monitorados",
    value: "—",
    icon: Scale,
    hint: "aguardando sync",
  },
  {
    label: "Prazos nos próximos 7d",
    value: "—",
    icon: CalendarClock,
    hint: "sem dados",
  },
  { label: "Publicações novas", value: "—", icon: Inbox, hint: "sem dados" },
  { label: "Documentos", value: "—", icon: FileText, hint: "sem dados" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos seus processos, prazos e integrações."
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, hint }, i) => (
          <div
            key={label}
            className="reveal bg-card rounded-xl border p-5 shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{label}</span>
              <Icon className="text-gold size-4" />
            </div>
            <p className="font-display mt-3 text-3xl leading-none tabular-nums">
              {value}
            </p>
            <p className="text-muted-foreground/70 mt-1.5 text-xs">{hint}</p>
          </div>
        ))}
      </section>

      <section
        className="reveal mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3"
        style={{ animationDelay: "260ms" }}
      >
        <Panel className="lg:col-span-2" title="Atividade recente">
          Assim que uma fonte for ativada e o sync rodar, os andamentos aparecem
          aqui.
        </Panel>
        <Panel title="Próximos prazos">Nenhum prazo cadastrado ainda.</Panel>
      </section>
    </>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card rounded-xl border p-6", className)}>
      <h2 className="font-display text-lg leading-none tracking-tight">
        {title}
      </h2>
      <div className="text-muted-foreground mt-4 flex min-h-32 items-center justify-center rounded-lg border border-dashed text-center text-sm">
        <span className="max-w-xs px-4">{children}</span>
      </div>
    </div>
  );
}
