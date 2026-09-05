import { describe, expect, it } from "vitest";

import type { ActionItemView } from "@/features/action-items/types";

import {
  buildAriaLabels,
  buildColumns,
  buildFunil,
  PIPELINE_ORDEM,
} from "./pipeline";

function item(
  overrides: Partial<ActionItemView> & { id: string },
): ActionItemView {
  return {
    intimation_id: "int-x",
    title: "Contestação",
    tipo: "contestar",
    gera_peca: true,
    tipo_origem: "declarado",
    tipo_status: "confiavel",
    due_date: "2026-09-04",
    status: "TODO",
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildAriaLabels", () => {
  it("dá o rótulo base (título — court · CNJ, vence dd/mm) quando o card é único", () => {
    const items = [
      item({
        id: "a",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
    ];

    const labels = buildAriaLabels(items);

    expect(labels.get("a")).toBe(
      "Contestação — TJSP · 1012473-58.2024.8.26.0100, vence 04/09",
    );
  });

  it("gera aria-label DIFERENTE para 2 providências com título/CNJ/urgência idênticos mas ids diferentes", () => {
    const items = [
      item({
        id: "aaaaaa111111",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
      item({
        id: "bbbbbb222222",
        title: "Contestação",
        court: "TJSP",
        cnj_number: "1012473-58.2024.8.26.0100",
        due_date: "2026-09-04",
      }),
    ];

    const labels = buildAriaLabels(items);
    const labelA = labels.get("aaaaaa111111");
    const labelB = labels.get("bbbbbb222222");

    expect(labelA).not.toBe(labelB);
    // Ambos preservam a base legível (não viram só um id cru).
    expect(labelA).toContain("Contestação — TJSP");
    expect(labelB).toContain("Contestação — TJSP");
  });

  it("sem CNJ/court/due_date, ainda gera um rótulo legível e não-vazio", () => {
    const items = [
      item({ id: "a", title: "Dar-se por ciente", due_date: null }),
    ];

    const labels = buildAriaLabels(items);

    expect(labels.get("a")).toBe("Dar-se por ciente — sem prazo definido");
  });
});

describe("buildColumns", () => {
  const nameFor = () => null;

  it("sempre devolve as 3 colunas fixas, na ordem A Fazer/Em elaboração/Concluída", () => {
    const columns = buildColumns([], nameFor);

    expect(columns.map((c) => c.key)).toEqual([...PIPELINE_ORDEM]);
    expect(columns.map((c) => c.key)).toEqual(["TODO", "WORKING", "DONE"]);
    expect(columns.map((c) => c.label)).toEqual([
      "A Fazer",
      "Em elaboração",
      "Concluída",
    ]);
    expect(columns.every((c) => c.vazia)).toBe(true);
  });

  it("agrupa cada providência na coluna do seu status (sem cap de tamanho)", () => {
    const items = [
      item({ id: "0", status: "TODO" }),
      item({ id: "1", status: "WORKING" }),
      item({ id: "2", status: "WORKING" }),
      item({ id: "3", status: "DONE" }),
    ];

    const columns = buildColumns(items, nameFor);
    const byKey = Object.fromEntries(columns.map((c) => [c.key, c]));

    expect(byKey.TODO.n).toBe(1);
    expect(byKey.WORKING.n).toBe(2);
    expect(byKey.DONE.n).toBe(1);
    expect(byKey.WORKING.vazia).toBe(false);
  });

  it("SUGGESTED nunca entra em nenhuma coluna (não aparece no board)", () => {
    const items = [
      item({ id: "1", status: "SUGGESTED" }),
      item({ id: "2", status: "TODO" }),
    ];

    const columns = buildColumns(items, nameFor);
    const total = columns.reduce((acc, c) => acc + c.n, 0);

    expect(total).toBe(1);
    expect(columns.find((c) => c.key === "TODO")!.n).toBe(1);
  });

  it("o href do card aponta pra /providencias/:id", () => {
    const items = [item({ id: "abc123", status: "WORKING" })];

    const columns = buildColumns(items, nameFor);
    const working = columns.find((c) => c.key === "WORKING")!;

    expect(working.cards[0].href).toBe("/providencias/abc123");
  });

  it("deriva geraPeca/fluxoCurto do gera_peca da providência", () => {
    const items = [
      item({ id: "peca", status: "TODO", gera_peca: true }),
      item({ id: "ciencia", status: "TODO", gera_peca: false }),
    ];

    const cards = buildColumns(items, nameFor).find(
      (c) => c.key === "TODO",
    )!.cards;
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

    expect(byId.peca.geraPeca).toBe(true);
    expect(byId.peca.fluxoCurto).toBe(false);
    expect(byId.ciencia.geraPeca).toBe(false);
    expect(byId.ciencia.fluxoCurto).toBe(true);
  });

  it("2 cards com origem e cnjCurto diferentes geram origemAriaLabel diferente (WCAG 2.4.4)", () => {
    const items = [
      item({
        id: "1",
        status: "WORKING",
        intimation_id: "int-1",
        cnj_number: "1012473-58.2024.8.26.0100",
      }),
      item({
        id: "2",
        status: "WORKING",
        intimation_id: "int-2",
        cnj_number: "2098765-11.2023.8.26.0053",
      }),
    ];

    const columns = buildColumns(items, nameFor);
    const [cardA, cardB] = columns.find((c) => c.key === "WORKING")!.cards;

    expect(cardA.temOrigem).toBe(true);
    expect(cardB.temOrigem).toBe(true);
    expect(cardA.origemAriaLabel).not.toBe(cardB.origemAriaLabel);
    expect(cardA.origemAriaLabel).toContain(cardA.cnjCurto);
    expect(cardB.origemAriaLabel).toContain(cardB.cnjCurto);
  });
});

describe("buildFunil", () => {
  it("3 etapas, percentuais somando 100% do total contado", () => {
    const items = [
      item({ id: "0", status: "TODO" }),
      item({ id: "1", status: "WORKING" }),
      item({ id: "2", status: "WORKING" }),
      item({ id: "3", status: "DONE" }),
    ];

    const funil = buildFunil(items);

    expect(funil.map((e) => e.n)).toEqual([1, 2, 1]);
    const somaPct = funil.reduce((acc, e) => acc + parseInt(e.pct, 10), 0);
    expect(somaPct).toBe(100);
  });

  it("Concluída conta igual às demais etapas — sem exclusão especial do total", () => {
    const items = [
      item({ id: "1", status: "DONE" }),
      item({ id: "2", status: "DONE" }),
    ];

    const funil = buildFunil(items);
    const concluida = funil.find((e) => e.key === "DONE")!;

    expect(concluida.n).toBe(2);
    expect(concluida.pct).toBe("100%");
  });

  it("com 0 providências não quebra (divisão por zero evitada)", () => {
    const funil = buildFunil([]);

    expect(funil.every((e) => e.n === 0)).toBe(true);
    expect(funil.every((e) => e.pct === "0%")).toBe(true);
  });
});
