import { describe, expect, it } from "vitest";

import {
  dataDoFiltro,
  filtroDeIntervalo,
  filtroDeUrgencia,
  limparUrgencia,
  rotuloIntervalo,
} from "./intervalo-vencimento";

describe("intervalo de vencimento", () => {
  it("mantém a data civil e aceita ano bissexto", () => {
    const date = dataDoFiltro("2024-02-29")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2024, 1, 29,
    ]);
    expect(rotuloIntervalo("2024-02-29", "2024-02-29")).toBe("29/02/2024");
  });
  it("rejeita data inexistente ou formato inválido", () => {
    for (const value of ["2026-02-29", "06/09/2026", "2026-13-01", ""])
      expect(dataDoFiltro(value)).toBeUndefined();
  });
  it("expõe os dois limites inclusivos no chip", () => {
    expect(rotuloIntervalo("2026-09-06", "2026-09-08")).toBe(
      "06/09/2026 – 08/09/2026",
    );
  });
  it("troca entre atalho e intervalo sem acumular filtros temporais", () => {
    const range = {
      ...filtroDeUrgencia("hoje"),
      ...filtroDeIntervalo("2026-09-06", "2026-09-08"),
    };
    expect(range).toEqual({
      urgencia: null,
      due_from: "2026-09-06",
      due_to: "2026-09-08",
    });
    expect({ ...range, ...filtroDeUrgencia("atraso") }).toEqual({
      urgencia: "atraso",
      due_from: null,
      due_to: null,
    });
    expect({ ...range, ...limparUrgencia }).toEqual({
      urgencia: null,
      due_from: null,
      due_to: null,
    });
  });
});
