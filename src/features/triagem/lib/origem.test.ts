import { describe, expect, it } from "vitest";

import type { OrigemFacets } from "@/features/intimacoes/types";

import { ABA_TODOS_LABEL, abasVisiveis, ORIGEM_LABEL } from "./origem";

function facets(overrides: Partial<OrigemFacets> = {}): OrigemFacets {
  return {
    declarado: 0,
    validado: 0,
    calculado: 0,
    divergente: 0,
    ia: 0,
    manual: 0,
    a_classificar: 0,
    sem_prazo: 0,
    ...overrides,
  };
}

describe("ORIGEM_LABEL", () => {
  it("mapeia ia → 'Inferido' (nunca 'IA' — diretiva app-wide)", () => {
    expect(ORIGEM_LABEL.ia).toBe("Inferido");
  });

  it("usa os rótulos pt-BR de cada origem", () => {
    expect(ORIGEM_LABEL.declarado).toBe("Declarado");
    expect(ORIGEM_LABEL.validado).toBe("Validado");
    expect(ORIGEM_LABEL.calculado).toBe("Calculado");
    expect(ORIGEM_LABEL.divergente).toBe("Divergente");
    expect(ORIGEM_LABEL.manual).toBe("Manual");
    expect(ORIGEM_LABEL.a_classificar).toBe("A classificar");
    expect(ORIGEM_LABEL.sem_prazo).toBe("Sem prazo");
  });

  it("nenhum rótulo é 'IA'/'inteligência artificial'", () => {
    for (const label of Object.values(ORIGEM_LABEL)) {
      expect(label.toLowerCase()).not.toContain("ia");
      expect(label.toLowerCase()).not.toContain("inteligência");
    }
  });
});

describe("abasVisiveis", () => {
  it("'Todos' usa a SOMA dos facets, não o total filtrado (regressão)", () => {
    // Os facets são independentes do filtro ?origem= (o BE ignora a própria
    // dimensão de origem), então "Todos" = soma = total real da Triagem, mesmo
    // quando uma aba de origem está ativa (senão "Todos" mostraria o filtrado).
    const abas = abasVisiveis(
      facets({ declarado: 683, calculado: 3, ia: 1349 }),
    );
    expect(abas[0]).toEqual({
      value: null,
      label: ABA_TODOS_LABEL,
      count: 683 + 3 + 1349,
    });
  });

  it("oculta origens com contagem 0 (abas dinâmicas)", () => {
    const abas = abasVisiveis(
      facets({ declarado: 12, calculado: 5, ia: 3, sem_prazo: 8 }),
    );
    expect(abas.map((a) => a.value)).toEqual([
      null,
      "declarado",
      "calculado",
      "ia",
      "sem_prazo",
    ]);
    // validado/divergente/manual têm count 0 → não aparecem.
    expect(abas.find((a) => a.value === "validado")).toBeUndefined();
    expect(abas.find((a) => a.value === "divergente")).toBeUndefined();
    expect(abas.find((a) => a.value === "manual")).toBeUndefined();
  });

  it("'A classificar' (pendência) é aba própria, separada de 'Sem prazo' (ciência)", () => {
    const abas = abasVisiveis(facets({ a_classificar: 187, sem_prazo: 309 }));
    expect(abas.map((a) => a.value)).toEqual([null, "a_classificar", "sem_prazo"]);
    expect(abas.find((a) => a.value === "a_classificar")).toEqual({
      value: "a_classificar",
      label: "A classificar",
      count: 187,
    });
    expect(abas.find((a) => a.value === "sem_prazo")?.count).toBe(309);
  });

  it("respeita a ordem canônica das origens", () => {
    const abas = abasVisiveis(
      facets({ manual: 1, declarado: 1, ia: 1, validado: 1 }),
    );
    expect(abas.map((a) => a.value)).toEqual([
      null,
      "declarado",
      "validado",
      "ia",
      "manual",
    ]);
  });

  it("usa a contagem do facet em cada aba (label 'Inferido' pra ia)", () => {
    const abas = abasVisiveis(facets({ ia: 7 }));
    const inferido = abas.find((a) => a.value === "ia");
    expect(inferido).toEqual({ value: "ia", label: "Inferido", count: 7 });
  });

  it("só mostra 'Todos' quando nenhuma origem tem item", () => {
    const abas = abasVisiveis(facets());
    expect(abas).toHaveLength(1);
    expect(abas[0]?.value).toBeNull();
    expect(abas[0]?.count).toBe(0);
  });
});
