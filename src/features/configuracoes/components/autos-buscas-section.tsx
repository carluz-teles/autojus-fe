"use client";

import { FolderDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/skeletons";

import { useAutosHistory } from "../hooks/use-autos-history";

// "Buscas de autos" na aba Fontes de dados › Histórico. Cada linha = um lote
// (sync_run do court): quantos PROCESSOS foram sincronizados no tribunal e quando.
// `records` é processos, não documentos (esses aparecem por-processo no cockpit).
function fmtDataHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AutosBuscasSection() {
  const q = useAutosHistory();
  // Silencioso em erro — a aba Histórico já tem as varreduras DJEN; não quebra a tela.
  if (q.isError) return null;
  return (
    <section aria-label="Buscas de autos" className="mt-6">
      <h3 className="section-label mb-2">Buscas de autos</h3>
      <p className="text-fg3 mb-3 max-w-[460px] text-[12.5px] leading-[1.5]">
        Cada busca de autos no tribunal — quantos processos foram sincronizados
        e quando.
      </p>
      {q.isPending ? (
        <SkeletonRows rows={3} />
      ) : !q.data?.length ? (
        <p className="surface-panel text-fg3 px-4 py-8 text-center text-[12.5px]">
          Nenhuma busca de autos ainda. Conecte um tribunal para a busca
          começar.
        </p>
      ) : (
        <div className="surface-panel divide-line2 reveal-stagger divide-y overflow-hidden">
          {q.data.map((r) => {
            const ok = r.status === "OK";
            const cor = ok ? "var(--primary)" : "var(--destructive)";
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="grid size-9 flex-none place-items-center rounded-xl"
                  style={{
                    background: `color-mix(in oklch, ${cor} 12%, transparent)`,
                    color: cor,
                  }}
                >
                  <FolderDown
                    className="size-4"
                    strokeWidth={1.9}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {r.records} {r.records === 1 ? "processo" : "processos"}
                    <span className="text-fg3 font-normal">
                      {" "}
                      · {fmtDataHora(r.finished_at)}
                    </span>
                  </p>
                  {r.retried > 0 ? (
                    <p className="text-fg3 text-[11.5px]">
                      {r.retried} reagendado{r.retried === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                <Badge variant={ok ? "success" : "warning"}>
                  {ok ? "Concluída" : "Falhou"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
