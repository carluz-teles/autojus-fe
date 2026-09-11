import { describe, expect, it } from "vitest";

import type { IntimacaoDetalheView } from "@/features/intimacoes/types";

import type { PrazoDetalheView } from "../types";
import {
  bloqueiaProvidencias,
  confirmacaoSchema,
  prazoVisivel,
  precisaConfirmarPrazo,
  tipoIncompativelComPrazo,
} from "./confirmacao";

const prazo = {
  status: "PENDING",
  confirmed: false,
  confirmacao_exigida: true,
} as PrazoDetalheView;

describe("confirmação de prazo", () => {
  it.each(["ciencia", "sem_ato"])(
    "pede revisão do tipo %s com prazo declarado ativo, preservando a data",
    (tipo_ato) => {
      const p = {
        ...prazo,
        tipo_ato,
        origem: "declarado",
        confirmacao_exigida: false,
        end_date: "2026-09-08",
      } as PrazoDetalheView;
      expect(tipoIncompativelComPrazo(p)).toBe(true);
      expect(precisaConfirmarPrazo(p, "declarado")).toBe(true);
      expect(bloqueiaProvidencias(p, "declarado")).toBe(true);
      expect(p.end_date).toBe("2026-09-08");
      for (const patch of [
        { confirmed: true },
        { status: "MET" },
        { status: "CANCELLED" },
        { status: "NO_DEADLINE" },
      ]) {
        const revised = { ...p, ...patch } as PrazoDetalheView;
        expect(tipoIncompativelComPrazo(revised)).toBe(false);
        expect(bloqueiaProvidencias(revised, "declarado")).toBe(false);
      }
    },
  );
  it("bloqueia divergência até a decisão, sem oferecer confirmação que a contorne", () => {
    const p = {
      ...prazo,
      origem: "calculado",
      cross_validation: {
        resultado: "divergente",
        data_declarada: "2026-09-10",
        data_calculada: "2026-09-11",
        dif_dias: 1,
      },
    } as PrazoDetalheView;
    expect(bloqueiaProvidencias(p, "calculado")).toBe(true);
    expect(precisaConfirmarPrazo(p, "calculado")).toBe(false);
  });
  it.each([
    ["ia", "OPEN", false, true],
    ["ia", "MISSED", false, true],
    ["ia", "OPEN", true, false],
    ["ia", "MET", false, false],
    ["ia", "CANCELLED", false, false],
    ["a_classificar", "NO_DEADLINE", false, true],
    ["sem_prazo", "NO_DEADLINE", false, false],
  ])(
    "bloqueio em %s/%s confirmado=%s: %s",
    (estado, status, confirmed, expected) => {
      expect(
        bloqueiaProvidencias(
          { ...prazo, status, confirmed } as PrazoDetalheView,
          estado as string,
        ),
      ).toBe(expected);
    },
  );
  it("oferece revisão para prazo declarado recuperado, até a confirmação humana", () => {
    expect(
      precisaConfirmarPrazo(
        { ...prazo, reopened_for_review: true },
        "declarado",
      ),
    ).toBe(true);
    expect(
      precisaConfirmarPrazo(
        { ...prazo, reopened_for_review: true, confirmed: true },
        "declarado",
      ),
    ).toBe(false);
  });
  it.each(["declarado", "calculado", "validado", "divergente", "manual"])(
    "oferece confirmação exigida pela política para %s",
    (estado) => {
      expect(precisaConfirmarPrazo(prazo, estado)).toBe(true);
    },
  );
  it("exige revisão do inferido, inclusive importação já vencida", () => {
    expect(precisaConfirmarPrazo(prazo, "ia")).toBe(true);
    expect(precisaConfirmarPrazo({ ...prazo, status: "MISSED" }, "ia")).toBe(
      true,
    );
  });
  it("exige definição de a classificar mesmo com status NO_DEADLINE", () => {
    expect(
      precisaConfirmarPrazo(
        { ...prazo, status: "NO_DEADLINE" },
        "a_classificar",
      ),
    ).toBe(true);
  });
  it("não exige revisão novamente pela origem histórica", () => {
    expect(precisaConfirmarPrazo({ ...prazo, confirmed: true }, "ia")).toBe(
      false,
    );
    expect(
      precisaConfirmarPrazo(
        { ...prazo, confirmacao_exigida: false },
        "calculado",
      ),
    ).toBe(false);
  });
  it("não reabre prazo cancelado ou cumprido", () => {
    expect(precisaConfirmarPrazo({ ...prazo, status: "CANCELLED" }, "ia")).toBe(
      false,
    );
    expect(precisaConfirmarPrazo({ ...prazo, status: "MET" }, "ia")).toBe(
      false,
    );
  });
  it("oculta vencimento de preenchimento para NO_DEADLINE", () => {
    const p = {
      status: "NO_DEADLINE",
      days_left: -200,
      end_date: "2024-01-01",
    } as IntimacaoDetalheView["prazo"];
    expect(prazoVisivel({ prazo: p })).toBeNull();
    const aberto = { ...p, status: "OPEN" } as IntimacaoDetalheView["prazo"];
    expect(prazoVisivel({ prazo: aberto })).toBe(aberto);
  });
  it("rejeita tipo indefinido, dias vazios e ausência de revisão", () => {
    const form = {
      tipo_ato: "manifestacao",
      days: 5,
      counting: "BUSINESS",
      anchor_event: "DEADLINE_START",
      doubled: false,
      manual_extra_days: 0,
      revisado: true,
    };
    expect(confirmacaoSchema.safeParse(form).success).toBe(true);
    for (const fields of [
      { tipo_ato: "indeterminado" },
      { tipo_ato: "ciencia" },
      { days: NaN },
      { days: 0 },
      { revisado: false },
    ]) {
      expect(confirmacaoSchema.safeParse({ ...form, ...fields }).success).toBe(
        false,
      );
    }
  });
});
