import { describe, expect, it } from "vitest";

import {
  brParaISO,
  dataDoFiltro,
  filtroDeIntervalo,
  filtroDeUrgencia,
  intervaloMesAtual,
  isoParaBR,
  limparUrgencia,
  mascararDataBR,
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

describe("entrada manual de data BR (dd/mm/aaaa ↔ ISO)", () => {
  it("mascara progressivamente e ignora não-dígitos", () => {
    expect(mascararDataBR("0")).toBe("0");
    expect(mascararDataBR("09")).toBe("09");
    expect(mascararDataBR("0909")).toBe("09/09");
    expect(mascararDataBR("09092026")).toBe("09/09/2026");
    expect(mascararDataBR("09/09/2026")).toBe("09/09/2026");
    expect(mascararDataBR("0909202699")).toBe("09/09/2026"); // trunca em 8 dígitos
    expect(mascararDataBR("ab9/x9")).toBe("99");
  });
  it("converte BR completa e válida para ISO; senão vazio", () => {
    expect(brParaISO("09/09/2026")).toBe("2026-09-09");
    expect(brParaISO("29/02/2024")).toBe("2024-02-29"); // bissexto
    expect(brParaISO("29/02/2026")).toBe(""); // data inexistente
    expect(brParaISO("31/13/2026")).toBe(""); // mês inválido
    expect(brParaISO("09/09")).toBe(""); // incompleta
    expect(brParaISO("")).toBe("");
  });
  it("converte ISO para exibição BR; ISO inválido/ausente vira vazio", () => {
    expect(isoParaBR("2026-09-09")).toBe("09/09/2026");
    expect(isoParaBR("2026-02-29")).toBe("");
    expect(isoParaBR("")).toBe("");
  });
  it("é ida-e-volta para uma data real", () => {
    expect(brParaISO(isoParaBR("2026-09-30"))).toBe("2026-09-30");
    expect(isoParaBR(brParaISO("30/09/2026"))).toBe("30/09/2026");
  });
});

describe("atalho Este mês (mês-calendário)", () => {
  it("devolve primeiro e último dia do mês de referência (inclusivos)", () => {
    expect(intervaloMesAtual(new Date(2026, 8, 23))).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(intervaloMesAtual(new Date(2024, 1, 10))).toEqual({
      from: "2024-02-01",
      to: "2024-02-29", // bissexto
    });
  });
});
