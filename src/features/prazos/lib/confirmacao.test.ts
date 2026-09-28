import { describe, expect, it } from "vitest";

import type { IntimacaoDetalheView } from "@/features/intimacoes/types";

import type { PrazoDetalheView } from "../types";
import {
  bloqueiaProvidencias,
  confirmacaoSchema,
  prazoAtivoParaCorrecao,
  prazoVisivel,
  precisaConfirmarPrazo,
  tipoIncompativelComPrazo,
} from "./confirmacao";

const prazo = {
  status: "PENDING",
  confirmed: false,
  confirmacao_exigida: true,
} as PrazoDetalheView;

describe("confirmação de prazo (v3: gate morto)", () => {
  // v3 (erd-motor-de-prazos-v3 §3 · erd-intimacao-triagem §10.4): o tipo é lazy (gerar-peça) e a
  // data é defensável — o detalhe NÃO força mais confirmação de tipo+prazo, e NADA bloqueia Gerar
  // peça / Dar ciência. precisaConfirmarPrazo e bloqueiaProvidencias viraram no-op (sempre false),
  // inclusive nos casos que ANTES bloqueavam: confirmacao_exigida, a_classificar, ia, divergência,
  // reopened, tipo incompatível. A revisão da divergência real vive no ApuracaoPrazo (não-bloqueante).
  it.each([
    ["ia", "OPEN"],
    ["ia", "MISSED"],
    ["a_classificar", "NO_DEADLINE"],
    ["declarado", "PENDING"],
    ["calculado", "PENDING"],
  ])("precisaConfirmarPrazo é sempre false — %s/%s", (estado, status) => {
    expect(
      precisaConfirmarPrazo({ ...prazo, status } as PrazoDetalheView, estado),
    ).toBe(false);
  });

  it("bloqueiaProvidencias é sempre false — inclusive divergência e confirmacao_exigida", () => {
    const divergente = {
      ...prazo,
      origem: "calculado",
      cross_validation: {
        resultado: "divergente",
        data_declarada: "2026-09-10",
        data_calculada: "2026-09-11",
        dif_dias: 1,
      },
    } as PrazoDetalheView;
    expect(bloqueiaProvidencias(divergente, "calculado")).toBe(false);
    expect(bloqueiaProvidencias(prazo, "ia")).toBe(false);
    expect(bloqueiaProvidencias(null, "a_classificar")).toBe(false);
  });

  // tipoIncompativelComPrazo continua vivo (usado em detalhe-apresentacao.ts para a UI de aviso):
  // detecta uma classificação legada (ciencia/sem_ato) contradizendo um prazo ativo não confirmado.
  it.each(["ciencia", "sem_ato"])(
    "tipoIncompativelComPrazo detecta tipo %s legado num prazo ativo",
    (tipo_ato) => {
      const p = { ...prazo, tipo_ato } as PrazoDetalheView;
      expect(tipoIncompativelComPrazo(p)).toBe(true);
      for (const patch of [
        { confirmed: true },
        { status: "MET" },
        { status: "CANCELLED" },
        { status: "NO_DEADLINE" },
      ]) {
        expect(
          tipoIncompativelComPrazo({ ...p, ...patch } as PrazoDetalheView),
        ).toBe(false);
      }
    },
  );

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

  it("confirmacaoSchema rejeita tipo indefinido, dias vazios e ausência de revisão", () => {
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

  // Whitelist canônica reusada por dois CTAs independentes (divergência
  // prazo×obrigação e exceção de classificação, caso 018f8dd1) — uma só
  // fonte, não `status !== "NO_DEADLINE"` (que deixaria passar terminais que
  // o BE rejeita com 409).
  it.each(["OPEN", "PENDING"] as const)(
    "prazoAtivoParaCorrecao(%s) → true",
    (status) => {
      expect(prazoAtivoParaCorrecao(status)).toBe(true);
    },
  );
  it.each(["MISSED", "MET", "CANCELLED", "NO_DEADLINE"] as const)(
    "prazoAtivoParaCorrecao(%s) → false",
    (status) => {
      expect(prazoAtivoParaCorrecao(status)).toBe(false);
    },
  );
});
