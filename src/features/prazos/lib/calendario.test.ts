import { describe, expect, it } from "vitest";

import {
  buildDia,
  buildMes,
  buildSemana,
  type CalEvento,
  diffDias,
  inicioDaSemana,
  tituloDia,
  tituloMes,
  toISODate,
} from "./calendario";

// Data de referência fixa nos testes (não usa new Date() — o dinamismo vive no
// hook; o lib é puro e recebe a referência). Set/2026 pra a grade ser previsível.
const REF = new Date(2026, 8, 15); // 15/09/2026 (mês = índice 8)
const HOJE = "2026-09-15";

function ev(overrides: Partial<CalEvento> & { id: string }): CalEvento {
  return {
    tipo: "prazo",
    titulo: "Prazo fatal",
    sub: "TJSP",
    dia: "2026-09-15",
    dias: 0,
    href: "/x",
    ...overrides,
  };
}

describe("toISODate / fromISODate / diffDias", () => {
  it("serializa a data local sem deslize de timezone", () => {
    expect(toISODate(new Date(2026, 8, 1))).toBe("2026-09-01");
    expect(toISODate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("conta dias corridos entre duas datas ISO", () => {
    expect(diffDias("2026-09-15", "2026-09-20")).toBe(5);
    expect(diffDias("2026-09-15", "2026-09-10")).toBe(-5);
    expect(diffDias("2026-09-15", "2026-09-15")).toBe(0);
  });
});

describe("inicioDaSemana", () => {
  it("volta pro domingo da semana que contém a referência", () => {
    // 15/09/2026 é terça → domingo é 13/09.
    expect(toISODate(inicioDaSemana(REF))).toBe("2026-09-13");
  });
});

describe("títulos dinâmicos", () => {
  it("mês em português + ano", () => {
    expect(tituloMes(REF)).toBe("Setembro 2026");
  });
  it("dia com dia-da-semana longo + dd/mm", () => {
    expect(tituloDia(REF)).toBe("terça-feira · 15/09");
  });
});

describe("buildMes", () => {
  it("monta uma grade de semanas de 7 colunas com lead correto", () => {
    // 01/09/2026 é terça (getDay=2) → 2 células vazias antes do dia 1.
    const weeks = buildMes([], REF, HOJE);
    expect(weeks[0].dias).toHaveLength(7);
    expect(weeks[0].dias[0].vazia).toBe(true);
    expect(weeks[0].dias[1].vazia).toBe(true);
    expect(weeks[0].dias[2]).toMatchObject({ vazia: false, num: 1 });
  });

  it("marca o dia de HOJE (dinâmico, não hardcoded)", () => {
    const weeks = buildMes([], REF, HOJE);
    const dias = weeks.flatMap((w) => w.dias);
    const hoje = dias.filter((d) => d.hoje);
    expect(hoje).toHaveLength(1);
    expect(hoje[0].num).toBe(15);
  });

  it("preserva todos os eventos e informa quantos ficam recolhidos", () => {
    const eventos: CalEvento[] = [
      ev({ id: "p1", dia: "2026-09-15" }),
      ev({
        id: "prov1",
        tipo: "providencia",
        titulo: "Contestar",
        dia: "2026-09-15",
      }),
      ev({ id: "p2", dia: "2026-09-15" }),
      ev({ id: "p3", dia: "2026-09-15" }),
      ev({ id: "p4", dia: "2026-09-15" }), // 5º no mesmo dia → vira "+1 mais"
      ev({ id: "outro", dia: "2026-09-20" }),
    ];
    const dias = buildMes(eventos, REF, HOJE).flatMap((w) => w.dias);
    const d15 = dias.find((d) => d.num === 15)!;
    expect(d15.temEv).toBe(true);
    expect(d15.evs).toHaveLength(5);
    expect(d15.temExtra).toBe(true);
    expect(d15.extra).toBe("2");

    const d20 = dias.find((d) => d.num === 20)!;
    expect(d20.evs).toHaveLength(1);
    expect(d20.temExtra).toBe(false);
  });

  it("decora o chip com cor de urgência (vencido = vermelho)", () => {
    const dias = buildMes(
      [ev({ id: "v", dia: "2026-09-15", dias: -2 })],
      REF,
      HOJE,
    ).flatMap((w) => w.dias);
    const d15 = dias.find((d) => d.num === 15)!;
    expect(d15.evs![0].urgK).toBe("critico");
  });
});

describe("buildSemana", () => {
  it("devolve 7 dias (dom–sáb) da semana de referência", () => {
    const semana = buildSemana([], REF, HOJE);
    expect(semana).toHaveLength(7);
    expect(semana[0].data).toBe("13/09"); // domingo
    expect(semana[6].data).toBe("19/09"); // sábado
  });

  it("distribui eventos no dia certo e marca livres", () => {
    const semana = buildSemana([ev({ id: "a", dia: "2026-09-15" })], REF, HOJE);
    const terca = semana.find((d) => d.data === "15/09")!;
    expect(terca.vazio).toBe(false);
    expect(terca.evs).toHaveLength(1);
    expect(terca.hoje).toBe(true);
    const domingo = semana.find((d) => d.data === "13/09")!;
    expect(domingo.vazio).toBe(true);
  });
});

describe("buildDia", () => {
  it("lista os eventos do dia na faixa 'dia todo' e monta as horas 08–19", () => {
    const dia = buildDia(
      [ev({ id: "a", dia: "2026-09-15" }), ev({ id: "b", dia: "2026-09-16" })],
      REF,
    );
    expect(dia.data).toBe("15/09");
    expect(dia.temAllday).toBe(true);
    expect(dia.allday).toHaveLength(1);
    expect(dia.allday[0].id).toBe("a");
    expect(dia.horas[0].label).toBe("08:00");
    expect(dia.horas.at(-1)!.label).toBe("19:00");
  });

  it("sem eventos → faixa vazia (audiências fora de escopo, sem eventos posicionados)", () => {
    const dia = buildDia([], REF);
    expect(dia.temAllday).toBe(false);
    expect(dia.allday).toHaveLength(0);
    // A vista não expõe eventos por horário — só a grade de horas.
    expect(dia).not.toHaveProperty("eventos");
  });
});

it("não trunca dias e semanas com muitos vencimentos", () => {
  const events = Array.from({ length: 15 }, (_, i) => ev({ id: `prazo-${i}` }));
  expect(buildDia(events, REF).allday).toHaveLength(15);
  expect(
    buildSemana(events, REF, HOJE).find((d) => d.data === "15/09")?.evs,
  ).toHaveLength(15);
});
