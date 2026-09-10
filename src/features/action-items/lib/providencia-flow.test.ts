import { describe, expect, it } from "vitest";

import type { FilingAttempt } from "@/features/filing/types";

import type { ActionItemView } from "../types";
import { type FlowDraft, providenciaFlow } from "./providencia-flow";

const item = (patch: Partial<ActionItemView> = {}): ActionItemView => ({
  id: "work-1",
  intimation_id: "source-1",
  title: "Elaborar manifestação",
  tipo: "manifestar",
  gera_peca: true,
  tipo_origem: "manual",
  tipo_status: "confiavel",
  status: "WORKING",
  due_date: null,
  completed_at: null,
  created_at: "2026-09-09T10:00:00Z",
  updated_at: "2026-09-09T10:00:00Z",
  ...patch,
});
const draft = (patch: Partial<FlowDraft> = {}): FlowDraft => ({
  id: "draft-1",
  title: "Manifestação",
  status: "DRAFT",
  saga_state: "DRAFTED",
  created_at: "2026-09-09T10:00:00Z",
  updated_at: "2026-09-09T10:00:00Z",
  sent_to_signing_at: null,
  signed_at: null,
  filed_at: null,
  filing_number: "",
  ...patch,
});
const attempt = (status: FilingAttempt["status"]): FilingAttempt => ({
  id: "filing-1",
  draft_id: "draft-1",
  status,
  requested_at: "2026-09-09T10:00:00Z",
  finished_at: null,
  failure_reason: "",
  filing_number: "REF-1",
});

describe("etapas reais da providência", () => {
  it("mantém elaboração, revisão e protocolo futuros antes de criar a peça", () => {
    const flow = providenciaFlow(item({ status: "TODO" }));
    expect(flow.current).toBe("work");
    expect(flow.steps.map((s) => s.id)).toEqual([
      "origin",
      "work",
      "writing",
      "review",
      "filing",
      "done",
    ]);
    expect(flow.steps.find((s) => s.id === "filing")?.state).toBe("pending");
  });
  it("mantém sugestão e tipo a confirmar na definição", () => {
    expect(providenciaFlow(item({ status: "SUGGESTED" })).title).toBe(
      "Revisar a providência sugerida",
    );
    expect(providenciaFlow(item({ tipo_status: "a_confirmar" })).title).toBe(
      "Confirmar o tipo de providência",
    );
  });
  it("não exige peça ou protocolo em trabalho sem peça e sem origem", () => {
    const flow = providenciaFlow(
      item({ gera_peca: false, intimation_id: "", source_kind: "manual" }),
    );
    expect(flow.steps.map((s) => s.id)).toEqual(["work", "done"]);
    expect(flow.steps[1].state).toBe("current");
  });
  it.each(["CREATED", "EXTRACTING", "FAILED"])(
    "mantém %s na elaboração sem confirmar revisão",
    (saga) => {
      const flow = providenciaFlow(
        item({ draft_id: "draft-1", draft_state: saga }),
      );
      expect(flow.current).toBe("writing");
      expect(flow.steps.find((s) => s.id === "review")?.state).toBe("pending");
    },
  );
  it.each(["DRAFTED", "REVIEWED"])("%s não é aprovação humana", (saga) => {
    const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
      draft: draft({ saga_state: saga }),
    });
    expect(flow.current).toBe("review");
    expect(flow.steps.find((s) => s.id === "review")?.state).toBe("current");
    expect(flow.filed).toBe(false);
  });
  it("envio para assinatura é um marco explícito, não protocolo", () => {
    const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
      draft: draft({ sent_to_signing_at: "2026-09-09T10:00:00Z" }),
    });
    expect(flow.current).toBe("filing");
    expect(flow.steps.find((s) => s.id === "review")?.state).toBe("recorded");
    expect(flow.filed).toBe(false);
  });
  it.each(["QUEUED", "PREPARING", "PREPARED", "CHECK_REQUIRED"] as const)(
    "preparação %s nunca confirma protocolo",
    (status) => {
      const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
        preparation: { status, message: "" },
      });
      expect(flow.current).toBe("filing");
      expect(flow.filed).toBe(false);
      expect(flow.done).toBe(false);
    },
  );
  it.each([
    "ENFILEIRADO",
    "PROTOCOLANDO",
    "CONFIRMACAO_PENDENTE",
    "FALHOU",
  ] as const)(
    "tentativa %s não é sucesso mesmo com número retornado",
    (status) => {
      const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
        filing: attempt(status),
      });
      expect(flow.filed).toBe(false);
      expect(flow.steps.find((s) => s.id === "filing")?.state).toBe("current");
    },
  );
  it("uma tentativa incerta prevalece sobre o estado FILED legado", () => {
    const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
      draft: draft({
        status: "FILED",
        filed_at: "2026-09-09T10:00:00Z",
        filing_number: "REF-1",
      }),
      filing: attempt("CONFIRMACAO_PENDENTE"),
    });
    expect(flow.filed).toBe(false);
    expect(flow.description).toContain("antes de qualquer novo envio");
  });
  it("confirma protocolo sem concluir automaticamente o trabalho", () => {
    const flow = providenciaFlow(item({ draft_id: "draft-1" }), {
      filing: attempt("PROTOCOLADO"),
    });
    expect(flow.filed).toBe(true);
    expect(flow.done).toBe(false);
    expect(flow.steps.find((s) => s.id === "done")?.state).toBe("current");
  });
  it("concluir manualmente a providência não pinta revisão e protocolo como concluídos", () => {
    const flow = providenciaFlow(item({ status: "DONE" }));
    expect(flow.done).toBe(true);
    expect(flow.filed).toBe(false);
    expect(flow.steps.find((s) => s.id === "filing")?.state).toBe("unrecorded");
    expect(flow.steps.find((s) => s.id === "review")?.state).toBe("unrecorded");
  });
  it.each(["CANCELLED", "DISMISSED"] as const)(
    "%s interrompe, não cumpre o fluxo",
    (status) => {
      const flow = providenciaFlow(item({ status }));
      expect(flow.done).toBe(false);
      expect(flow.steps.some((s) => s.state === "current")).toBe(false);
      expect(flow.steps.find((s) => s.id === "done")?.state).toBe("unrecorded");
    },
  );
  it("ignora evidências de outra peça", () => {
    const flow = providenciaFlow(item({ draft_id: "other" }), {
      draft: draft({ signed_at: "2026-09-09T10:00:00Z" }),
      filing: attempt("PROTOCOLADO"),
    });
    expect(flow.filed).toBe(false);
    expect(flow.current).toBe("writing");
  });
});
