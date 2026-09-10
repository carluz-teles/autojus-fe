import type { DemoJourney } from "./demo-data";

export function concludeDemoAnalysis(
  journeys: DemoJourney[],
  ids: string[] = ["analysis"],
): DemoJourney[] {
  const selected = new Set(ids);
  return journeys.map((item) =>
    !selected.has(item.id) || item.works.length
      ? item
      : {
          ...item,
          triage: `Análise concluída na simulação. Providência criada para ${item.owner}; prazo preservado: ${item.due}.`,
          works: [
            {
              id: `${item.id}-plan`,
              title:
                item.id === "analysis"
                  ? "Definir estratégia da manifestação"
                  : `Analisar ${item.subject.toLowerCase()}`,
              owner: item.owner,
              stage: "work",
              status: "A fazer",
              next: "Ver providência",
              explanation:
                "Definir a estratégia e conferir o prazo antes de elaborar a manifestação. Concluir a triagem não confirmou o prazo nem gerou uma peça.",
              blocker:
                item.due === "A confirmar"
                  ? "Prazo ainda a confirmar. A decisão de triagem não substitui a revisão do prazo."
                  : undefined,
              events: [
                {
                  title: "Providência criada após análise",
                  actor: "Marina Costa · simulação",
                  at: "09 set · 10:00",
                  detail:
                    "O mesmo trabalho está em Providências e na lista Fila. Nenhum dado real foi gravado.",
                },
              ],
            },
          ],
        },
  );
}
