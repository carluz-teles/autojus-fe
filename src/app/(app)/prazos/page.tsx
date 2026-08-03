import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

// Prévia (layout de referência): a agenda de prazos (deadline) derivados das
// intimações via lib/calendar. Calendário + lista dos próximos vencimentos.
const DIAS = Array.from({ length: 35 }, (_, i) => i - 4); // grade de mês fictícia

export default function PrazosPage() {
  return (
    <>
      <PageHeader
        title="Prazos"
        description="Vencimentos calculados no calendário forense (dias úteis, recesso do art. 220)."
        action={<Badge variant="outline">Prévia</Badge>}
      />

      <section className="reveal mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="font-display text-lg leading-none tracking-tight">
            Agosto 2026
          </h2>
          <div className="text-muted-foreground mt-4 grid grid-cols-7 gap-1 text-center text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d} className="py-1 font-medium">
                {d}
              </span>
            ))}
            {DIAS.map((d) => (
              <span
                key={d}
                className={
                  d >= 1 && d <= 31
                    ? "text-foreground/80 aspect-square rounded-md border py-2"
                    : "aspect-square py-2 opacity-30"
                }
              >
                {d >= 1 && d <= 31 ? d : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="font-display text-lg leading-none tracking-tight">
            Próximos vencimentos
          </h2>
          <div className="text-muted-foreground mt-4 flex min-h-40 items-center justify-center rounded-lg border border-dashed text-center text-sm">
            <span className="max-w-xs px-4">
              Nenhum prazo cadastrado. Ao aprovar as ações sugeridas de uma
              intimação, os prazos aparecem aqui.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
