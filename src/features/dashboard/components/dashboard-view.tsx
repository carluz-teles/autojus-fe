"use client";

import { AlarmClock, Clock, Inbox, Scale } from "lucide-react";
import Link from "next/link";

import { Avatar, Kpi } from "@/components/mock-ui/data-display";
import { Card, PageHeader, SectionTitle } from "@/components/mock-ui/layout";
import { useIntimacoes, useProcessos } from "@/features/shared/hooks";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { formatarData } from "@/lib/utils";

const ATIVIDADE = [
  {
    quando: "Hoje 10:42",
    o_que: "Renata Marcondes assinou a Petição de juntada",
    proc: "1017480-70.2020.8.26.0196",
  },
  {
    quando: "Hoje 09:55",
    o_que: "IA gerou 2 providências para a intimação de credenciamento",
    proc: "1017480-70.2020.8.26.0196",
  },
  {
    quando: "Ontem 18:03",
    o_que: "Luan Gomes confirmou prazo de 5 dias úteis",
    proc: "0000027-11.2022.8.26.0196",
  },
  {
    quando: "Ontem 12:14",
    o_que: "Importação DJEN concluída — 350 intimações novas",
    proc: "13 janelas",
  },
];

export function DashboardView() {
  const { data: intimacoes } = useIntimacoes();
  const { data: processos } = useProcessos();

  const decoradas = (intimacoes ?? []).map((i) => {
    const dias = i.prazo?.termoFinal ? diasRestantes(i.prazo.termoFinal) : null;
    return { ...i, dias, urgencia: urgenciaDe(dias) };
  });

  const urgentes = decoradas
    .filter((i) => i.dias !== null && i.dias <= 2)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

  const naoConfirmados = decoradas.filter(
    (i) => i.prazo?.estado === "sugerido",
  );

  const dias = [
    {
      label: "Atrasado",
      data: "até 18/08",
      teste: (d: number | null) => d !== null && d < 0,
    },
    { label: "Hoje", data: "qua, 19/08", teste: (d: number | null) => d === 0 },
    {
      label: "Amanhã",
      data: "qui, 20/08",
      teste: (d: number | null) => d === 1,
    },
    { label: "Sexta", data: "21/08", teste: (d: number | null) => d === 2 },
  ].map((g) => ({ ...g, itens: decoradas.filter((i) => g.teste(i.dias)) }));

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Dashboard"
        descricao="O que exige providência hoje, e como o escritório está andando."
        acoes={
          <span className="text-muted-foreground text-xs tabular-nums">
            Última captura DJEN: hoje, 06:10
          </span>
        }
      />

      <section className="mt-6 grid grid-cols-4 gap-4">
        <Kpi
          rotulo="Prazos em atraso"
          valor={decoradas.filter((i) => i.urgencia === "atraso").length}
          tom="danger"
          dica="exige providência hoje"
          icone={<AlarmClock className="size-4" />}
        />
        <Kpi
          rotulo="Vencem hoje"
          valor={decoradas.filter((i) => i.urgencia === "hoje").length}
          tom="warning"
          dica="dias úteis"
          icone={<Clock className="size-4" />}
        />
        <Kpi
          rotulo="Prazo não confirmado"
          valor={naoConfirmados.length}
          tom="info"
          dica="aguardando decisão humana"
          icone={<Inbox className="size-4" />}
        />
        <Kpi
          rotulo="Processos monitorados"
          valor={processos?.length ?? 0}
          dica="total do acervo"
          icone={<Scale className="size-4" />}
        />
      </section>

      <section className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <Card className="p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[19px] font-medium">
              Precisa de você hoje
            </h2>
            <Link href="/intimacoes" className="text-[12.5px]">
              Ver todas
            </Link>
          </div>
          <div className="mt-4">
            {urgentes.map((i) => (
              <Link
                key={i.id}
                href={`/intimacoes/${i.id}`}
                className="border-border hover:bg-muted grid grid-cols-[minmax(0,1fr)_132px_120px] items-center gap-4 border-t border-l-[3px] px-3 py-3.5 no-underline hover:no-underline"
                style={{ borderLeftColor: corDaUrgencia(i.urgencia) }}
              >
                <span className="min-w-0">
                  <span className="text-foreground block text-sm font-medium">
                    {i.titulo}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-[11.5px] tabular-nums">
                    {i.processo} · {i.providencias.length} providência(s)
                  </span>
                </span>
                <span
                  className="text-[12.5px] tabular-nums"
                  style={{ color: corDaUrgencia(i.urgencia) }}
                >
                  {rotuloPrazo(i.dias)}
                  <span className="text-muted-foreground block text-[11px]">
                    {i.prazo?.termoFinal
                      ? formatarData(i.prazo.termoFinal)
                      : "—"}
                  </span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Avatar nome={i.condutor} />
                  {i.condutor.split(" ")[0]}
                </span>
              </Link>
            ))}
            {urgentes.length === 0 && (
              <p className="border-border text-muted-foreground border-t py-4 text-sm">
                Nada vence nas próximas 48 horas.
              </p>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="font-display mb-3 text-[17px] font-medium">
            Próximos prazos
          </h2>
          {dias.map((d) => (
            <div
              key={d.label}
              className="border-border flex items-baseline justify-between gap-3 border-t py-2.5"
            >
              <span className="text-[13px]">
                {d.label}
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {" "}
                  · {d.data}
                </span>
              </span>
              <span className="text-muted-foreground text-[13px] tabular-nums">
                {d.itens.length} prazo(s)
              </span>
            </div>
          ))}
        </Card>
      </section>

      <Card className="mt-4 p-6">
        <h2 className="font-display mb-3 text-[19px] font-medium">
          Atividade recente
        </h2>
        {ATIVIDADE.map((a) => (
          <div
            key={a.quando + a.o_que}
            className="border-border grid grid-cols-[120px_minmax(0,1fr)_240px] items-baseline gap-4 border-t py-2.5"
          >
            <span className="text-muted-foreground text-xs tabular-nums">
              {a.quando}
            </span>
            <span className="text-[13.5px]">{a.o_que}</span>
            <span className="text-muted-foreground text-right text-xs tabular-nums">
              {a.proc}
            </span>
          </div>
        ))}
      </Card>

      <SectionTitle className="mt-8">
        Dados de demonstração — 19/08/2026
      </SectionTitle>
    </div>
  );
}
