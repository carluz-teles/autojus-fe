import { describe, expect, it } from "vitest";

import type { TaskView } from "@/features/tasks/types";

import {
  buildAriaLabels,
  buildColumns,
  buildFunil,
  PIPELINE_ORDEM,
} from "./pipeline";

function task(overrides: Partial<TaskView> & { id: string }): TaskView {
  return {
    title: "Contestação",
    due_date: "2026-09-04",
    status: "OPEN",
    source: "DEADLINE",
    completed_at: null,
    stage: "A_FAZER",
    ...overrides,
  };
}

describe("buildAriaLabels", () => {
  it("dá o rótulo base (título — court · CNJ, vence dd/mm) quando o card é único", () => {
    const tasks = [
      task({
        id: "a",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
    ];

    const labels = buildAriaLabels(tasks);

    expect(labels.get("a")).toBe(
      "Contestação — TJSP · 1012473-58.2024.8.26.0100, vence 04/09",
    );
  });

  it("gera aria-label DIFERENTE para 2 tasks com título/CNJ/urgência idênticos mas ids diferentes", () => {
    const tasks = [
      task({
        id: "aaaaaa111111",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
      task({
        id: "bbbbbb222222",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
    ];

    const labels = buildAriaLabels(tasks);
    const labelA = labels.get("aaaaaa111111");
    const labelB = labels.get("bbbbbb222222");

    expect(labelA).not.toBe(labelB);
    // Ambos preservam a base legível (não viram só um id cru).
    expect(labelA).toContain("Contestação — TJSP");
    expect(labelB).toContain("Contestação — TJSP");
  });

  it("sem CNJ/court/due_date, ainda gera um rótulo legível e não-vazio", () => {
    const tasks = [task({ id: "a", title: "Tarefa avulsa", due_date: null })];

    const labels = buildAriaLabels(tasks);

    expect(labels.get("a")).toBe("Tarefa avulsa — sem prazo definido");
  });
});

describe("buildColumns", () => {
  const nameFor = () => null;

  it("sempre devolve as 4 colunas fixas, na ordem A Fazer/Elaboração/Revisão/Concluída", () => {
    const columns = buildColumns([], nameFor);

    expect(columns.map((c) => c.key)).toEqual([...PIPELINE_ORDEM]);
    expect(columns.map((c) => c.label)).toEqual([
      "A Fazer",
      "Elaboração",
      "Revisão",
      "Concluída",
    ]);
    expect(columns.every((c) => c.vazia)).toBe(true);
  });

  it("agrupa cada tarefa na coluna do seu stage (sem cap de tamanho)", () => {
    const tasks = [
      task({ id: "0", stage: "A_FAZER" }),
      task({ id: "1", stage: "ELABORACAO" }),
      task({ id: "2", stage: "ELABORACAO" }),
      task({ id: "3", stage: "REVISAO" }),
      task({ id: "4", stage: "CONCLUIDA" }),
    ];

    const columns = buildColumns(tasks, nameFor);
    const byKey = Object.fromEntries(columns.map((c) => [c.key, c]));

    expect(byKey.A_FAZER.n).toBe(1);
    expect(byKey.ELABORACAO.n).toBe(2);
    expect(byKey.REVISAO.n).toBe(1);
    expect(byKey.CONCLUIDA.n).toBe(1);
    expect(byKey.ELABORACAO.vazia).toBe(false);
  });

  it("tarefa sem draft pula direto de A Fazer pra Concluída — nunca passa por Elaboração/Revisão", () => {
    const tasks = [
      task({ id: "1", title: "Ligar pro cliente", stage: "CONCLUIDA" }),
    ];

    const columns = buildColumns(tasks, nameFor);
    const byKey = Object.fromEntries(columns.map((c) => [c.key, c]));

    expect(byKey.CONCLUIDA.n).toBe(1);
    expect(byKey.CONCLUIDA.cards[0].id).toBe("1");
    expect(byKey.ELABORACAO.n).toBe(0);
    expect(byKey.REVISAO.n).toBe(0);
  });

  it("o href do card aponta pra /tarefas/:id", () => {
    const tasks = [task({ id: "abc123", stage: "ELABORACAO" })];

    const columns = buildColumns(tasks, nameFor);
    const elaboracao = columns.find((c) => c.key === "ELABORACAO")!;

    expect(elaboracao.cards[0].href).toBe("/tarefas/abc123");
  });

  it("2 cards com origem e cnjCurto diferentes geram origemAriaLabel diferente (WCAG 2.4.4)", () => {
    const tasks = [
      task({
        id: "1",
        stage: "ELABORACAO",
        intimation_id: "int-1",
        cnj_number: "1012473-58.2024.8.26.0100",
      }),
      task({
        id: "2",
        stage: "ELABORACAO",
        intimation_id: "int-2",
        cnj_number: "2098765-11.2023.8.26.0053",
      }),
    ];

    const columns = buildColumns(tasks, nameFor);
    const [cardA, cardB] = columns.find((c) => c.key === "ELABORACAO")!.cards;

    expect(cardA.temOrigem).toBe(true);
    expect(cardB.temOrigem).toBe(true);
    expect(cardA.origemAriaLabel).not.toBe(cardB.origemAriaLabel);
    expect(cardA.origemAriaLabel).toContain(cardA.cnjCurto);
    expect(cardB.origemAriaLabel).toContain(cardB.cnjCurto);
  });
});

describe("buildFunil", () => {
  it("4 etapas, percentuais somando 100% do total contado", () => {
    const tasks = [
      task({ id: "0", stage: "A_FAZER" }),
      task({ id: "1", stage: "ELABORACAO" }),
      task({ id: "2", stage: "ELABORACAO" }),
      task({ id: "3", stage: "REVISAO" }),
      task({ id: "4", stage: "CONCLUIDA" }),
    ];

    const funil = buildFunil(tasks);

    expect(funil.map((e) => e.n)).toEqual([1, 2, 1, 1]);
    const somaPct = funil.reduce((acc, e) => acc + parseInt(e.pct, 10), 0);
    expect(somaPct).toBe(100);
  });

  it("Concluída conta igual às demais etapas — sem exclusão especial do total", () => {
    const tasks = [
      task({ id: "1", stage: "CONCLUIDA" }),
      task({ id: "2", stage: "CONCLUIDA" }),
    ];

    const funil = buildFunil(tasks);
    const concluida = funil.find((e) => e.key === "CONCLUIDA")!;

    expect(concluida.n).toBe(2);
    expect(concluida.pct).toBe("100%");
  });

  it("com 0 tarefas não quebra (divisão por zero evitada)", () => {
    const funil = buildFunil([]);

    expect(funil.every((e) => e.n === 0)).toBe(true);
    expect(funil.every((e) => e.pct === "0%")).toBe(true);
  });
});
