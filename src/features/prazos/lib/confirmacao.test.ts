import { describe, expect, it } from "vitest";

import type { IntimacaoDetalheView } from "@/features/intimacoes/types";

import type { PrazoDetalheView } from "../types";
import {
  confirmacaoSchema,
  prazoVisivel,
  precisaConfirmarPrazo,
} from "./confirmacao";

const prazo = {
  status: "PENDING",
  confirmed: false,
  confirmacao_exigida: true,
} as PrazoDetalheView;

describe("confirmação de prazo", () => {
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
    "não abre confirmação de tipo para %s com outra pendência de apuração",
    (estado) => {
      expect(precisaConfirmarPrazo(prazo, estado)).toBe(false);
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
