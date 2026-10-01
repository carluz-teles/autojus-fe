import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import {
  closedDeliverySchema,
  closedMetadataSchema,
  closedPreviewSchema,
  closedReservationSchema,
  type ClosedRun,
  closedRunSchema,
  type ClosedSelection,
  closedSelectionSchema,
} from "./closed-test-schemas";

const root = "/curation";
export const closedKeys = {
  all: ["curation", "closed-tests"] as const,
  reservation: (id: string) =>
    ["curation", "closed-tests", "reservation", id] as const,
  run: (id: string) => ["curation", "closed-tests", "run", id] as const,
  report: (id: string) => ["curation", "closed-tests", "report", id] as const,
};
type RunBody = {
  request_id: string;
  expected_definition_digest: string;
  confirmed: true;
};
export type ClosedCommand =
  | {
      kind: "reserve";
      candidate: string;
      body: {
        request_id: string;
        selection: ClosedSelection;
        expected_preview_digest: string;
        confirmed: true;
      };
    }
  | { kind: "run"; reservation: string; body: RunBody }
  | {
      kind: "report";
      run: string;
      reservation: string;
      body: Omit<RunBody, "confirmed"> & { confirmed_exposure: true };
    };
export function sameClosedSelection(a: unknown, b: unknown) {
  const x = closedSelectionSchema.safeParse(a),
    y = closedSelectionSchema.safeParse(b);
  return (
    x.success && y.success && JSON.stringify(x.data) === JSON.stringify(y.data)
  );
}
const candidateURL = (id: string) =>
  `${root}/type-candidates/${encodeURIComponent(id)}`;
const reservationURL = (id: string) =>
  `${root}/type-closed-tests/${encodeURIComponent(id)}`;
const reportURL = (id: string) =>
  `${root}/type-closed-test-runs/${encodeURIComponent(id)}/report`;
export async function previewClosedTest(
  api: ApiFetcher,
  candidate: string,
  selection: ClosedSelection,
) {
  const body = closedSelectionSchema.parse(selection);
  const { data } = await api<{ data: unknown }>(
    `${candidateURL(candidate)}/closed-test-preview`,
    { method: "POST", body },
  );
  const p = closedPreviewSchema.parse(data);
  if (p.candidate_id !== candidate || !sameClosedSelection(body, p.selection))
    throw new Error("Preview não corresponde ao candidato e à seleção.");
  return p;
}
export async function getClosedReservation(
  api: ApiFetcher,
  candidate: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: unknown }>(
    `${candidateURL(candidate)}/closed-test-reservation`,
    { signal },
  );
  if (data === null) return null;
  const r = closedReservationSchema.parse(data);
  if (r.preview.candidate_id !== candidate)
    throw new Error("Reserva incompatível com o candidato.");
  return r;
}
export async function getClosedRun(
  api: ApiFetcher,
  reservation: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: unknown }>(
    `${reservationURL(reservation)}/run`,
    { signal },
  );
  if (data === null) return null;
  const r = closedRunSchema.parse(data);
  if (r.reservation_id !== reservation)
    throw new Error("Execução incompatível com a reserva.");
  return r;
}
export async function getClosedMetadata(
  api: ApiFetcher,
  run: string,
  reservation: string,
  signal?: AbortSignal,
) {
  try {
    const { data } = await api<{ data: unknown }>(reportURL(run), { signal });
    const m = closedMetadataSchema.parse(data);
    if (m.run_id !== run || m.reservation_id !== reservation)
      throw new Error("Metadados incompatíveis com a execução.");
    return m;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
export async function sendClosedCommand(api: ApiFetcher, c: ClosedCommand) {
  if (c.kind === "reserve") {
    const { data } = await api<{ data: unknown }>(
      `${candidateURL(c.candidate)}/closed-test-reservation`,
      { method: "POST", body: c.body },
    );
    const r = closedReservationSchema.parse(data);
    if (
      r.request_id !== c.body.request_id ||
      r.preview.candidate_id !== c.candidate ||
      r.preview.digest !== c.body.expected_preview_digest ||
      !sameClosedSelection(r.preview.selection, c.body.selection)
    )
      throw new Error("Recupere a reserva para conferir o recibo.");
    return { kind: c.kind, receipt: r };
  }
  if (c.kind === "run") {
    const { data } = await api<{ data: unknown }>(
      `${reservationURL(c.reservation)}/run`,
      { method: "POST", body: c.body },
    );
    const r = closedRunSchema.parse(data);
    if (
      r.request_id !== c.body.request_id ||
      r.reservation_id !== c.reservation ||
      r.definition_digest !== c.body.expected_definition_digest
    )
      throw new Error("Recupere a execução para conferir o recibo.");
    return { kind: c.kind, receipt: r };
  }
  const { data } = await api<{ data: unknown }>(reportURL(c.run), {
    method: "POST",
    body: c.body,
  });
  const d = closedDeliverySchema.parse(data);
  if (
    d.request_id !== c.body.request_id ||
    d.report.run_id !== c.run ||
    d.report.reservation_id !== c.reservation ||
    d.report.definition_digest !== c.body.expected_definition_digest
  )
    throw new Error("Recupere a emissão para conferir o relatório.");
  return { kind: c.kind, receipt: d };
}
export function closedTestPoll(
  run: ClosedRun | null | undefined,
  status: string,
) {
  return status !== "error" &&
    run?.eligible &&
    ["queued", "running"].includes(run.state)
    ? 2000
    : false;
}
