"use client";

// AGENDA DE INTIMAÇÕES — base de "Meus Prazos" (meus, agrupado por urgência de
// prazo) e "Fila" (todas ativas, lista plana). A intimação é a unidade: cada
// linha carrega o próprio prazo e as ações (Gerar peça / Dar ciência). Substitui
// o antigo board de action_items (WorkList). Roda sobre dados reais (useIntimacoes).

import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoView } from "@/features/intimacoes/types";

import { IntimacaoAgendaCard } from "./intimacao-agenda-card";

type BucketKey = "atraso" | "hoje" | "semana" | "depois" | "sem_data";

const BUCKETS: { key: BucketKey; label: string; nota?: string }[] = [
  { key: "atraso", label: "Atrasadas", nota: "Ação imediata" },
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "depois", label: "Depois" },
  { key: "sem_data", label: "Sem prazo definido", nota: "Requer triagem" },
];

function bucketDe(i: IntimacaoView): BucketKey {
  const d = i.prazo?.days_left;
  if (d == null) return "sem_data";
  if (d < 0) return "atraso";
  if (d === 0) return "hoje";
  if (d <= 7) return "semana";
  return "depois";
}

export function PrazosAgenda({
  meus,
  titulo,
}: {
  meus?: boolean;
  titulo: string;
}) {
  const q = useIntimacoes({
    assignee: meus ? "me" : undefined,
    sort: "deadline",
    user_status: "PENDING",
    limit: 20,
    prefetchNextPage: true,
  });
  const items = q.intimacoes;

  const header = (
    <>
      <h1 className="shrink-0 text-[13px] font-medium">{titulo}</h1>
      <span className="text-fg3 min-w-0 truncate text-[11px]">
        {q.total ? `${q.total.toLocaleString("pt-BR")} intimações` : ""}
      </span>
    </>
  );

  // Agenda por urgência (Meus Prazos) agrupa; a Fila é lista plana.
  const grupos = meus
    ? BUCKETS.map((b) => ({
        ...b,
        items: items.filter((i) => bucketDe(i) === b.key),
      })).filter((g) => g.items.length > 0)
    : [{ key: "todas" as const, label: "", nota: undefined, items }];

  return (
    <PageFrame header={header}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
        {q.isPending ? (
          <p role="status" className="text-muted-foreground p-6">
            Carregando…
          </p>
        ) : q.error ? (
          <div className="flex flex-col items-start gap-3 p-6">
            <p role="alert">Não foi possível carregar a agenda.</p>
            <Button variant="outline" onClick={() => q.refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground p-6">
            Nada por aqui — tudo em dia.
          </p>
        ) : (
          <>
            {grupos.map((g) => (
              <section key={g.key} className="flex flex-col gap-3">
                {g.label ? (
                  <div className="flex items-baseline gap-2">
                    <h2 className="section-label">{g.label}</h2>
                    <span className="text-fg3 text-xs">
                      {g.items.length}
                      {g.nota ? ` · ${g.nota}` : ""}
                    </span>
                  </div>
                ) : null}
                <ul className="flex flex-col gap-3">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <IntimacaoAgendaCard intimacao={i} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {q.hasMore ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => q.loadMore()}
                  disabled={q.isLoadingMore}
                >
                  {q.isLoadingMore ? "Carregando…" : "Carregar mais"}
                </Button>
              </div>
            ) : null}
            {q.isFetchNextPageError ? (
              <p role="alert" className="text-destructive text-center text-sm">
                Não foi possível carregar mais. Tente novamente.
              </p>
            ) : null}
          </>
        )}
      </div>
    </PageFrame>
  );
}
