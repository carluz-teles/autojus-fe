import { expect, it } from "vitest";

import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "../types/court-connection";
import { autosSyncTargets } from "./autos-sync";
import { connectionForSystem, groupCourtCatalog } from "./court-catalog";

const eproc: CourtCatalogEntry = {
  court: "TJSP",
  name: "São Paulo",
  system: "EPROC",
  available: true,
  source_url: "https://example.test",
  connection_mode: "PERSISTENT",
  capabilities: ["SYNC_AUTOS"],
};
const esaj: CourtCatalogEntry = {
  ...eproc,
  system: "ESAJ",
  connection_mode: "PER_OPERATION",
  capabilities: ["PREPARE_FILING"],
};
const connected = {
  id: "connection",
  court: "TJSP",
  system: "EPROC",
  status: "CONNECTED",
} as CourtConnectionView;

it("agrupa os dois sistemas no mesmo tribunal e mantém o contexto ao buscar por sistema", () => {
  const other = {
    ...eproc,
    court: "TJRS",
    name: "Rio Grande do Sul",
    available: false,
  };
  const entries = [other, esaj, eproc];
  expect(groupCourtCatalog(entries).map((g) => g.court)).toEqual([
    "TJSP",
    "TJRS",
  ]);
  for (const query of ["sao paulo", " e-SAJ ", "esaj", "TJSP"]) {
    const groups = groupCourtCatalog(entries, query);
    expect(groups).toHaveLength(1);
    expect(groups[0].systems.map((s) => s.system)).toEqual(["EPROC", "ESAJ"]);
  }
  expect(groupCourtCatalog(entries, "não existe")).toEqual([]);
});

it("conectar eproc nunca informa que e-SAJ ou outro tribunal está conectado", () => {
  expect(connectionForSystem(eproc, [connected])).toBe(connected);
  expect(connectionForSystem(esaj, [connected])).toBeUndefined();
  expect(
    connectionForSystem({ ...eproc, court: "TJRS" }, [connected]),
  ).toBeUndefined();
  expect(
    connectionForSystem(esaj, [{ ...connected, system: "ESAJ" }]),
  ).toBeUndefined();
});

it("disponibilidade de peticionamento não libera sincronização de autos", () => {
  const esajConnection = { ...connected, id: "esaj", system: "ESAJ" };
  expect(
    autosSyncTargets([eproc, esaj], [connected, esajConnection], {}),
  ).toEqual([connected]);
  expect(autosSyncTargets([eproc, esaj], [esajConnection], {})).toEqual([]);
  expect(
    autosSyncTargets(
      [{ ...eproc, capabilities: ["PREPARE_FILING"] }],
      [connected],
      {},
    ),
  ).toEqual([]);
});
