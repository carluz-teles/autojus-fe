"use client";

import {
  AlarmClock,
  CircleCheck,
  CirclePlay,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar, Kpi } from "@/components/mock-ui/data-display";
import { CelulaDupla, DataTable } from "@/components/mock-ui/data-table";
import { PageHeader, Segmented } from "@/components/mock-ui/layout";
import { Chip, StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import {
  type EstadoFiltro,
  FilterBar,
  FILTRO_VAZIO,
  passaFiltro,
} from "@/features/shared/filtros";
import { useTarefas, useUpdateTarefa } from "@/features/shared/hooks";
import {
  corDaUrgencia,
  diasRestantes,
  urgenciaDe,
} from "@/features/shared/prazo";
import type { Tarefa, TarefaStatus } from "@/features/shared/types";
import { cn, formatarData } from "@/lib/utils";

export const TOM_TAREFA: Record<TarefaStatus, Tom> = {
  Aberta: "neutral",
  "Em execução": "info",
  Concluída: "success",
  Atrasada: "danger",
  Cancelada: "warning",
};

export const COR_PRIORIDADE: Record<string, string> = {
  Alta: "var(--destructive)",
  Média: "var(--gold)",
  Baixa: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
};

const COLUNAS_QUADRO: TarefaStatus[] = [
  "Aberta",
  "Em execução",
  "Concluída",
  "Atrasada",
];

export function TarefasView() {
  const { data, isLoading } = useTarefas();
  const [vista, setVista] = useState<"lista" | "quadro">("lista");
  const [filtro, setFiltro] = useState<EstadoFiltro>(FILTRO_VAZIO);

  const todas = data ?? [];
  const visiveis = useMemo(
    () =>
      todas.filter((t) =>
        passaFiltro(
          {
            urgencia: urgenciaDe(diasRestantes(t.vencimento)),
            texto: [
              t.titulo,
              t.descricao,
              t.responsavel,
              t.prioridade,
              t.status,
              t.tipo,
            ].join(" · "),
          },
          filtro,
        ),
      ),
    [todas, filtro],
  );

  const conta = (s: TarefaStatus) =>
    todas.filter((t) => t.status === s).length;

  if (isLoading) return <div className="p-8">Carregando…</div>;

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Tarefas"
        descricao="O que fazer — tarefas derivadas dos prazos e intimações, atribuídas à equipe."
        acoes={
          <>
            <Segmented
              valor={vista}
              onChange={setVista}
              opcoes={[
                { valor: "lista", label: "Lista" },
                { valor: "quadro", label: "Quadro" },
              ]}
            />
          </>
        }
      >
        <div className="mt-6 grid grid-cols-4 gap-3">
          <Kpi
            rotulo="Abertas"
            valor={conta("Aberta")}
            tom="info"
            icone={<ListChecks className="size-4" />}
          />
          <Kpi
            rotulo="Em execução"
            valor={conta("Em execução")}
            tom="warning"
            icone={<CirclePlay className="size-4" />}
          />
          <Kpi
            rotulo="Concluídas"
            valor={conta("Concluída")}
            tom="success"
            icone={<CircleCheck className="size-4" />}
          />
          <Kpi
            rotulo="Atrasadas"
            valor={conta("Atrasada")}
            tom="danger"
            icone={<AlarmClock className="size-4" />}
          />
        </div>

        <FilterBar tela="tarefas" filtro={filtro} onChange={setFiltro} />
      </PageHeader>

      {vista === "lista" ? (
        <DataTable
          larguraMinima="920px"
          colunas={[
            { label: "Tarefa", largura: "380px" },
            { label: "Prazo", largura: "112px" },
            { label: "Responsável", largura: "150px" },
            { label: "Prioridade", largura: "104px" },
            { label: "Status", largura: "142px" },
          ]}
          rodape={`Mostrando ${visiveis.length} de ${todas.length}`}
          onLimpar={() => setFiltro(FILTRO_VAZIO)}
          linhas={visiveis.map((t) => ({
            id: t.id,
            href: `/tarefas/${t.id}`,
            tom: corDaUrgencia(urgenciaDe(diasRestantes(t.vencimento))),
            celulas: [
              <CelulaDupla
                key="t"
                principal={t.titulo}
                apoio={`${t.codigo} · ${t.descricao}`}
              />,
              <span key="p" className="tabular-nums text-muted-foreground">
                {formatarData(t.vencimento)}
              </span>,
              <span key="r" className="flex items-center gap-2 text-muted-foreground">
                <Avatar nome={t.responsavel} size={21} />
                {t.responsavel.split(" ")[0]}
              </span>,
              <span key="pr" className="flex items-center gap-1.5">
                <span
                  className="size-[7px] rounded-full"
                  style={{ background: COR_PRIORIDADE[t.prioridade] }}
                />
                {t.prioridade}
              </span>,
              <StatusBadge key="s" tone={TOM_TAREFA[t.status]} ponto>
                {t.status}
              </StatusBadge>,
            ],
          }))}
        />
      ) : (
        <Quadro tarefas={visiveis} />
      )}
    </div>
  );
}

/** Quadro com drag and drop nativo: soltar num status muda o status de verdade. */
function Quadro({ tarefas }: { tarefas: Tarefa[] }) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<TarefaStatus | null>(null);
  const atualizar = useUpdateTarefa(arrastando ?? "");

  const soltar = (status: TarefaStatus) => {
    if (arrastando) atualizar.mutate({ status });
    setArrastando(null);
    setAlvo(null);
  };

  return (
    <div className="mt-4 grid grid-cols-4 gap-4">
      {COLUNAS_QUADRO.map((status) => {
        const cards = tarefas.filter((t) => t.status === status);
        const cor =
          status === "Atrasada"
            ? "var(--destructive)"
            : status === "Em execução"
              ? "var(--gold)"
              : status === "Concluída"
                ? "var(--primary)"
                : "color-mix(in oklch, var(--muted-foreground) 45%, transparent)";

        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setAlvo(status);
            }}
            onDragLeave={() => setAlvo((a) => (a === status ? null : a))}
            onDrop={() => soltar(status)}
            className={cn(
              "flex min-w-0 flex-col rounded-xl border border-transparent p-1",
              alvo === status &&
                "border-dashed border-[color-mix(in_oklch,var(--primary)_45%,transparent)] bg-[color-mix(in_oklch,var(--primary)_6%,transparent)]",
            )}
          >
            <div
              className="flex items-center gap-2 border-b-2 pb-2.5"
              style={{ borderBottomColor: cor }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: cor }}
              />
              <span className="text-[13px] font-medium">{status}</span>
              <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 pt-3">
              {cards.map((t) => (
                <Link
                  key={t.id}
                  href={`/tarefas/${t.id}`}
                  draggable
                  onDragStart={() => setArrastando(t.id)}
                  onDragEnd={() => setArrastando(null)}
                  className={cn(
                    "block rounded-xl border-l-[3px] bg-card p-3.5 no-underline ring-hairline hover:no-underline",
                    arrastando === t.id && "opacity-45",
                  )}
                  style={{ borderLeftColor: cor }}
                >
                  <span className="flex items-center gap-2">
                    <Chip>{t.codigo}</Chip>
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className="size-[7px] rounded-full"
                        style={{ background: COR_PRIORIDADE[t.prioridade] }}
                      />
                      {t.prioridade}
                    </span>
                  </span>
                  <span className="mt-2 mb-2.5 block text-[13.5px] leading-snug text-foreground">
                    {t.titulo}
                  </span>
                  <span className="flex items-center gap-2 border-t border-border pt-2.5">
                    <Avatar nome={t.responsavel} size={21} />
                    <span className="text-[11.5px] tabular-nums text-muted-foreground">
                      vence {formatarData(t.vencimento)}
                    </span>
                  </span>
                </Link>
              ))}
              {cards.length === 0 && (
                <span className="px-1 py-2 text-xs text-muted-foreground/60">
                  Nada aqui.
                </span>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
