import { describe, expect, it } from "vitest";

import type { PrazoAgendaView } from "../types";
import { prazoParaEvento } from "./calendario-eventos";

const prazo = {
  id: "deadline",
  intimation_id: "origin",
  end_date: "2026-09-08T00:00:00Z",
  days_left: 1,
  tipo_ato: "manifestacao",
  cnj_number: "4006620-46.2026.8.26.0196",
  court: "TJSP",
  status: "OPEN",
  days: 10,
  counting: "BUSINESS",
} as PrazoAgendaView;

describe("eventos do calendário", () => {
  it("identifica o ato e preserva CNJ e destino da intimação", () => {
    const event = prazoParaEvento(prazo)!;
    expect(event.titulo).toBe("Manifestação");
    expect(event.sub).toContain(prazo.cnj_number);
    expect(event.contagem).toBe("10 dias úteis");
    expect(event.href).toBe("/intimacoes/origin");
    expect(event.dia).toBe("2026-09-08");
  });
  it("não cria um link inválido nem evento sem vencimento", () => {
    expect(prazoParaEvento({ ...prazo, intimation_id: "" })).toBeNull();
    expect(prazoParaEvento({ ...prazo, end_date: "" })).toBeNull();
  });
});
