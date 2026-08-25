"use client";

import { Sheet } from "@/components/mock-ui/sheet";
import { StatusBadge } from "@/components/mock-ui/status-badge";

import type { CaptureRunView } from "../types";
import {
  fmtDuracao,
  fmtInt,
  fmtJanela,
  fmtQuando,
  kindLabel,
  statusTom,
  triggerLabel,
} from "./capturas-formatters";

function MiniCard({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-xl p-3.5">
      <span className="font-display text-[22px] leading-none tabular-nums">
        {fmtInt.format(valor)}
      </span>
      <span className="text-muted-foreground text-[11.5px]">{rotulo}</span>
    </div>
  );
}

function ExecucaoRow({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-t py-2.5 text-[13.5px]">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

export function CapturaDrawer({
  run,
  onFechar,
}: {
  run: CaptureRunView | null;
  onFechar: () => void;
}) {
  if (!run) return null;

  const kLabel = kindLabel(run.kind);
  const janela = fmtJanela(run.kind, run.window_from, run.window_to);
  const titulo = `${kLabel} · ${janela}`;
  // Em andamento (finished_at nulo) → mostra o início, pra não ficar vazio.
  const quando = fmtQuando(run.finished_at ?? run.started_at);
  const tom = statusTom(run.display_status);

  return (
    <Sheet
      aberto={run !== null}
      titulo={titulo}
      onFechar={onFechar}
      rodape={<span />}
    >
      {/* Sub-header: quando + estado */}
      <div className="-mt-1 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-[12.5px] tabular-nums">
          {quando}
        </span>
        <StatusBadge tone={tom}>{run.display_status}</StatusBadge>
      </div>

      {/* Motivo: qual OAB disparou essa captura (INITIAL_LOAD/CATCH_UP only) */}
      {triggerLabel(run.trigger_reason, run.trigger_oabs) && (
        <div className="-mt-1">
          <span className="text-muted-foreground text-[12.5px]">
            {triggerLabel(run.trigger_reason, run.trigger_oabs)}
          </span>
        </div>
      )}

      {/* Efeito no acervo */}
      <section>
        <h3 className="text-muted-foreground mb-3 text-[10.5px] font-medium tracking-[0.10em] uppercase">
          Efeito no acervo
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <MiniCard rotulo="Processos novos" valor={run.court_records_new} />
          <MiniCard rotulo="Intimações novas" valor={run.intimations_new} />
        </div>
      </section>

      {/* Execução */}
      <section>
        <h3 className="text-muted-foreground mb-1 text-[10.5px] font-medium tracking-[0.10em] uppercase">
          Execução
        </h3>
        <ExecucaoRow rotulo="Janela" valor={janela} />
        <ExecucaoRow rotulo="Duração" valor={fmtDuracao(run.duration_sec)} />
        <ExecucaoRow
          rotulo={run.finished_at ? "Concluída em" : "Iniciada em"}
          valor={quando}
        />
      </section>
    </Sheet>
  );
}
