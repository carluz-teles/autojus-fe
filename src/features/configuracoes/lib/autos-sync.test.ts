import { expect, it } from "vitest";

import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "../types/court-connection";
import {
  autosSyncFeedback,
  autosSyncTargets,
  summarizeAutosSync,
} from "./autos-sync";

it("sincroniza somente conexões ativas e disponíveis, uma por tribunal", () => {
  const catalog = [
    { court: "TJSP", system: "EPROC", available: true },
    { court: "TJRS", system: "EPROC", available: false },
  ] as CourtCatalogEntry[];
  const connection = {
    id: "1",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
  } as CourtConnectionView;
  const list = [
    connection,
    { ...connection, id: "2" },
    { ...connection, court: "TJRS" },
  ];
  expect(autosSyncTargets(catalog, list, {})).toEqual([connection]);
  expect(
    autosSyncTargets(catalog, [{ ...connection, status: "MFA_REQUIRED" }], {}),
  ).toEqual([]);
  expect(
    autosSyncTargets(catalog, list, {
      court: "TJRS",
      courtRecordId: "record",
      degree: "G1",
    }),
  ).toEqual([]);
  expect(
    autosSyncTargets(catalog, list, {
      court: "TJSP",
      courtRecordId: "record",
      degree: "G2",
    }),
  ).toEqual([]);
  expect(
    autosSyncTargets(catalog, list, {
      court: "TJSP",
      courtRecordId: "record",
      degree: "G1",
    }),
  ).toEqual([connection]);
});

// A2 (docs/qa-remediation-evidence/fe-operations-architecture.md): o catálogo —
// não um filtro `system!=='EPROC'` hardcoded — é a única autoridade sobre qual
// portal sincroniza autos. Confirmado no catálogo REAL do BE
// (internal/court/catalog.go:43-46): TJSP/ESAJ tem `available=true`,
// `connection_mode=PERSISTENT`, `capabilities=[SYNC_AUTOS, PREPARE_FILING]`.
it("sincroniza e-SAJ quando o catálogo anuncia SYNC_AUTOS (dois portais conectados → dois acervos)", () => {
  const catalog = [
    { court: "TJSP", system: "EPROC", available: true },
    {
      court: "TJSP",
      system: "ESAJ",
      available: true,
      connection_mode: "PERSISTENT",
      capabilities: ["SYNC_AUTOS", "PREPARE_FILING"],
    },
  ] as CourtCatalogEntry[];
  const eproc = {
    id: "1",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
  } as CourtConnectionView;
  const esaj = { ...eproc, id: "2", system: "ESAJ" };
  expect(autosSyncTargets(catalog, [eproc, esaj], {})).toEqual([eproc, esaj]);
});

it("NÃO sincroniza um portal conectado sem a capability SYNC_AUTOS no catálogo (sem fanout cego)", () => {
  const catalog = [
    {
      court: "TJSP",
      system: "ESAJ",
      available: true,
      connection_mode: "PERSISTENT",
      capabilities: ["PREPARE_FILING"], // sem SYNC_AUTOS
    },
  ] as CourtCatalogEntry[];
  const esaj = {
    id: "1",
    court: "TJSP",
    system: "ESAJ",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(autosSyncTargets(catalog, [esaj], {})).toEqual([]);
});

it("NÃO sincroniza um portal PER_OPERATION mesmo disponível e com SYNC_AUTOS (não é conexão persistente)", () => {
  const catalog = [
    {
      court: "TJSP",
      system: "ESAJ",
      available: true,
      connection_mode: "PER_OPERATION",
      capabilities: ["SYNC_AUTOS"],
    },
  ] as CourtCatalogEntry[];
  const esaj = {
    id: "1",
    court: "TJSP",
    system: "ESAJ",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(autosSyncTargets(catalog, [esaj], {})).toEqual([]);
});

it("dedup por court:system continua valendo entre portais distintos (não é mais fixo em EPROC)", () => {
  const catalog = [
    {
      court: "TJSP",
      system: "ESAJ",
      available: true,
      connection_mode: "PERSISTENT",
      capabilities: ["SYNC_AUTOS"],
    },
  ] as CourtCatalogEntry[];
  const esaj = {
    id: "1",
    court: "TJSP",
    system: "ESAJ",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(autosSyncTargets(catalog, [esaj, { ...esaj, id: "2" }], {})).toEqual([
    esaj,
  ]);
});

// A1 gêmeo FE (mesmo achado do BE): degree=UNKNOWN é o grau de DESCOBERTA (DJEN
// nunca revela grau), não uma prova de portal incompatível — elegível SÓ quando o
// court/system alvo já é suportado/conectado (a mesma checagem de catálogo
// abaixo, nunca um bypass). G2/SUPERIOR continuam de fora (fora do achado A1).
it("A1: degree=UNKNOWN elegível quando o court/system é suportado e conectado", () => {
  const catalog = [
    { court: "TJSP", system: "EPROC", available: true },
  ] as CourtCatalogEntry[];
  const connection = {
    id: "1",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(
    autosSyncTargets(catalog, [connection], {
      court: "TJSP",
      courtRecordId: "record",
      degree: "UNKNOWN",
    }),
  ).toEqual([connection]);
});

it("A1: degree=UNKNOWN NÃO ganha suporte inventado — court/system não suportado continua vazio", () => {
  const catalog = [
    { court: "TJRS", system: "EPROC", available: false },
  ] as CourtCatalogEntry[];
  const connection = {
    id: "1",
    court: "TJRS",
    system: "EPROC",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(
    autosSyncTargets(catalog, [connection], {
      court: "TJRS",
      courtRecordId: "record",
      degree: "UNKNOWN",
    }),
  ).toEqual([]);
});

it("A1: G2/SUPERIOR continuam bloqueados no gate de degree (não fazem parte do achado)", () => {
  const catalog = [
    { court: "TJSP", system: "EPROC", available: true },
  ] as CourtCatalogEntry[];
  const connection = {
    id: "1",
    court: "TJSP",
    system: "EPROC",
    status: "CONNECTED",
  } as CourtConnectionView;
  expect(
    autosSyncTargets(catalog, [connection], {
      court: "TJSP",
      courtRecordId: "record",
      degree: "SUPERIOR",
    }),
  ).toEqual([]);
});

it("keeps terminal failures visible after reload without requiring a mutation result", () => {
  const status = summarizeAutosSync([
    {
      queued: 0,
      pending: 0,
      failed: 1,
      status: "failed",
      error: "A busca foi interrompida após várias tentativas.",
    },
  ]);
  expect(status.pending).toBe(0);
  expect(status.status).toBe("failed");
  expect(autosSyncFeedback(status)).toMatchObject({
    failed: true,
    title: "Busca de autos interrompida",
  });
});

it("does not report queued work as successful when polling finds exhausted retries", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 2, status: "failed" },
    { queued: 2, pending: 2, failures: [] },
  );
  expect(feedback.failed).toBe(true);
  expect(feedback.title).not.toContain("finalizada");
});

it("keeps new requests blocked while any tribunal still has pending work", () => {
  const status = summarizeAutosSync([
    { queued: 0, pending: 0, failed: 1, status: "failed" },
    { queued: 0, pending: 2, failed: 0, status: "pending" },
  ]);
  expect(status).toMatchObject({ pending: 2, failed: 1, status: "pending" });
  expect(autosSyncFeedback(status).title).toBe("Busca de autos em andamento");
});

it("returns to pending after a manual retry resets failed work", () => {
  const status = summarizeAutosSync([
    { queued: 1, pending: 1, failed: 0, status: "pending" },
  ]);
  expect(status.failed).toBe(0);
  expect(autosSyncFeedback(status).failed).toBe(false);
  expect(autosSyncFeedback(status).title).toBe("Busca de autos em andamento");
});

it("does not report a partial scheduling request as full success", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 1, pending: 1, failures: ["TJRS: conexão indisponível"] },
  );
  expect(feedback.failed).toBe(true);
  expect(feedback.title).toBe("Não foi possível concluir todas as buscas");
});

it("only reports completion when accepted work finishes without failures", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 1, pending: 1, failures: [] },
  );
  expect(feedback.failed).toBe(false);
  expect(feedback.title).toBe("Busca de autos finalizada");
});

// O BE deixou de marcar a conexão inteira como "precisa de autos" (internal/court/
// manual_sync.go — o gate voltou a valer) e passou a devolver DOIS fatos diferentes:
// `discovered` (o que a cobertura da conexão viu) e `queued` (o que de fato vai ser
// buscado). `discovered > 0` com `queued = 0` e status "idle" é a resposta honesta
// "achei seu acervo e nada precisa de autos agora" — a UI tem que DIZER isso, com os
// números, em vez de cair no "Nenhum processo encontrado na cobertura".
it("diz em voz alta que o acervo foi encontrado e nada precisa de autos (discovered > 0, queued = 0)", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 0, pending: 0, discovered: 1067, failures: [] },
  );
  expect(feedback.failed).toBe(false);
  expect(feedback.title).toBe("Nenhum processo precisa dos autos agora");
  // Os NÚMEROS aparecem — é o que separa "achei 1.067 e nada precisa" de "não achei nada".
  expect(feedback.description).toContain("1067");
  // Nada de promessa que não vai acontecer: queued = 0 não é "buscando autos".
  expect(feedback.description).not.toMatch(/buscando|em andamento/i);
  expect(feedback.title).not.toContain("finalizada");
  // A UI do produto não cita tecnologia/IA.
  expect(`${feedback.title} ${feedback.description}`).not.toMatch(
    /\bia\b|intelig/i,
  );
});

it("mantém 'nada na cobertura' quando a conexão não achou processo algum (discovered = 0)", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 0, pending: 0, discovered: 0, failures: [] },
  );
  expect(feedback.title).toBe("Nenhum processo para sincronizar");
});

it("singulariza a contagem do acervo descoberto", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 0, pending: 0, discovered: 1, failures: [] },
  );
  expect(feedback.description).toContain("1 processo ");
  expect(feedback.description).not.toContain("1 processos");
});

it("soma o discovered de cada tribunal no resumo da solicitação", () => {
  expect(
    summarizeAutosSync([
      { queued: 0, pending: 0, failed: 0, discovered: 12, status: "idle" },
      { queued: 2, pending: 2, failed: 0, discovered: 30, status: "pending" },
    ]),
  ).toMatchObject({ discovered: 42, queued: 2, status: "pending" });
});

it("trabalho enfileirado ganha a cópia de sucesso mesmo com discovered alto", () => {
  const feedback = autosSyncFeedback(
    { queued: 0, pending: 0, failed: 0, status: "idle" },
    { queued: 3, pending: 3, discovered: 1067, failures: [] },
  );
  expect(feedback.title).toBe("Busca de autos finalizada");
});
