import { describe, expect, it } from "vitest";

import { estadoIntimacao } from "./estado";

describe("estadoIntimacao", () => {
  it("prazo vencido sem peça (VENCIDA) nunca é rotulado nem tonificado como sucesso", () => {
    const estado = estadoIntimacao({
      user_status: "PENDING",
      resolution: "",
      work_stage: "VENCIDA",
    });
    expect(estado.label).toBe("Prazo vencido");
    expect(estado.tone).toBe("expired");
    expect(estado.tone).not.toBe("done");
    expect(estado.encerrada).toBe(true);
  });

  it("protocolada (FILED) vence sobre VENCIDA — nunca deveria coexistir, mas FILED tem precedência", () => {
    const estado = estadoIntimacao({
      user_status: "PENDING",
      resolution: "",
      work_stage: "FILED",
    });
    expect(estado.label).toBe("Concluída · Protocolada");
    expect(estado.tone).toBe("done");
  });

  it("ciência (RESOLVED) permanece sucesso — distinto de vencido", () => {
    const estado = estadoIntimacao({
      user_status: "RESOLVED",
      resolution: "",
      work_stage: "CONFIRMED",
    });
    expect(estado.label).toBe("Concluída · Ciência");
    expect(estado.tone).toBe("done");
  });

  it("ignorada é distinta de vencida (ambas encerradas, tons diferentes)", () => {
    const ignorada = estadoIntimacao({
      user_status: "IGNORED",
      resolution: "",
      work_stage: "RECEIVED",
    });
    const vencida = estadoIntimacao({
      user_status: "PENDING",
      resolution: "",
      work_stage: "VENCIDA",
    });
    expect(ignorada.encerrada).toBe(true);
    expect(vencida.encerrada).toBe(true);
    expect(ignorada.tone).not.toBe(vencida.tone);
  });

  it("pendente comum (nem vencida nem em elaboração) fica em tom pending, não expired", () => {
    const estado = estadoIntimacao({
      user_status: "PENDING",
      resolution: "",
      work_stage: "RECEIVED",
    });
    expect(estado.label).toBe("Pendente");
    expect(estado.tone).toBe("pending");
  });
});
