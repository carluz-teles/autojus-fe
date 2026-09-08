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
