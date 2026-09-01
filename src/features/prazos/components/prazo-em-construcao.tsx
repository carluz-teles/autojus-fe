import { Hammer } from "lucide-react";

// Placeholder full-bleed para vistas de prazo ainda não portadas (Meus Prazos,
// Fila, Calendário). Mantém a casca "Linear": top-bar de 44px com o título da
// vista, corpo centralizado. Some conforme cada vista for portada do mockup.
export function PrazoEmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">{titulo}</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="border-line bg-panel text-fg3 grid size-12 place-items-center rounded-xl border">
          <Hammer className="size-5" strokeWidth={1.7} />
        </div>
        <div className="font-display text-[18px]">{titulo}</div>
        <p className="text-fg3 max-w-[320px] text-[12.5px] leading-[1.55]">
          Esta vista chega numa próxima fatia do port — portada direto do mockup
          do Claude Design.
        </p>
      </div>
    </div>
  );
}
