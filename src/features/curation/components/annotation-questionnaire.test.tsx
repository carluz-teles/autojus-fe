// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { annotationFixture } from "../__tests__/annotation-fixture";
import contractFixtures from "../__tests__/intimation-label-v1.json";
import {
  type AnnotationAssignmentInput,
  annotationKeys,
  assignmentWritable,
} from "../services/annotation-assignments";
import {
  evidenceFromSelection,
  intimationAnnotationSchema,
} from "../services/annotation-schema";
import { AnnotationQuestionnaire } from "./annotation-questionnaire";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  input: AnnotationAssignmentInput;
function Harness() {
  const { data } = useQuery({
    queryKey: annotationKeys.input(input.assignment.id),
    queryFn: async () => input,
    initialData: input,
    enabled: false,
  });
  return (
    <AnnotationQuestionnaire
      input={data}
      writable={assignmentWritable(data.assignment)}
    />
  );
}
async function mount() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === text,
  );
  expect(button, text).toBeDefined();
  await act(async () => button!.click());
}
async function choose(id: string, value: string) {
  const select = host.querySelector<HTMLSelectElement>(`#${id}`)!;
  expect(select, id).not.toBeNull();
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function type(id: string, value: string) {
  const node = host.querySelector<HTMLTextAreaElement>(`#${id}`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function selectEvidence(quote: string) {
  const node = host.querySelector<HTMLTextAreaElement>("#annotation-source")!;
  const start = node.value.indexOf(quote);
  await act(async () => {
    node.focus();
    node.setSelectionRange(start, start + quote.length);
    node.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Shift", bubbles: true }),
    );
    document.dispatchEvent(new Event("selectionchange"));
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-30T15:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  input = annotationFixture("assisted");
  const text = input.snapshot.facts.text,
    start = text.indexOf("15 dias úteis");
  input.prediction!.suggestion.deadline_cues = [
    {
      ...evidenceFromSelection(text, start, start + "15 dias úteis".length),
      quantity: 15,
      unit: "business_days",
      exact_source_span: true,
    },
  ];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("rendered annotation questionnaire", () => {
  it("shows the full multi-act hypothesis without filling the human answer", async () => {
    const annotation = intimationAnnotationSchema.parse(
      contractFixtures.cases.find((c) => c.name === "multi_act")!.annotation,
    );
    input.prediction!.engine_version = "intimation-inference-v1";
    input.prediction!.suggestion.annotation = annotation;
    input.prediction!.suggestion.type_in_catalog = false;
    input.snapshot.facts.text = contractFixtures.text;
    input.snapshot_digest = annotation.snapshot_digest;
    await mount();
    const hypothesis = host.querySelector("[aria-label='Sugestão original']")!;
    expect(hypothesis.textContent).toContain("Ato 1");
    expect(hypothesis.textContent).toContain("Ato 2");
    expect(host.querySelector("#act-type-0")).toBeNull();
    expect(mocks.api).not.toHaveBeenCalled();
    input = {
      ...input,
      assignment: { ...input.assignment, mode: "blind", prediction_id: null },
    };
    await act(async () =>
      client.setQueryData(annotationKeys.input(input.assignment.id), input),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(host.querySelector("[aria-label='Sugestão original']")).toBeNull();
  });
  it("requires explicit dimension confirmation and submits two acts with exact Unicode evidence", async () => {
    await mount();
    expect(
      host.querySelector("[aria-label='Sugestão original']"),
    ).not.toBeNull();
    expect(host.querySelector("#act-type-0")).toBeNull();
    await click("Adicionar ato");
    expect(host.querySelector<HTMLSelectElement>("#act-type-0")!.value).toBe(
      "",
    );
    await click("Aplicar o tipo sugerido a este ato");
    expect(host.querySelector<HTMLSelectElement>("#act-type-0")!.value).toBe(
      "manifestacao_generica",
    );
    await choose("recipient-0", "client");
    await choose("actionability-0", "duty");
    await selectEvidence("manifestação");
    await click("Usar trecho selecionado como evidência do ato 1");
    await click("Aplicar este prazo ao ato 1");
    expect(host.querySelector<HTMLInputElement>("#quantity-0")!.value).toBe(
      "15",
    );
    await click("Adicionar ato");
    await choose("act-type-1", "ciencia");
    await choose("recipient-1", "both");
    await choose("actionability-1", "awareness");
    await selectEvidence("Ciência às partes.");
    await click("Usar trecho selecionado como evidência do ato 2");
    await choose("deadline-kind-1", "none");
    await type("reason-1", "Somente ciência no exemplo sintético.");
    await choose("answerability", "partial");
    await type("missing-context", "calendário e termo inicial");
    mocks.api.mockResolvedValueOnce({
      data: {
        assignment: { ...input.assignment, state: "submitted", revision: 2 },
        submission: {
          id: "synthetic-submission",
          assignment_id: input.assignment.id,
          digest: "c".repeat(64),
          blind_eligible: false,
          submitted_at: new Date().toISOString(),
        },
        idempotent_replay: false,
      },
    });
    await click("Submeter minha resposta");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    const body = mocks.api.mock.calls[0][1].body;
    expect(body.annotation.label.acts).toHaveLength(2);
    expect(body.annotation.label.acts[0].evidence.quote).toBe("manifestação");
    expect(body.annotation.label.acts[1].evidence.quote).toBe(
      "Ciência às partes.",
    );
    expect(body.annotation.label.acts[1].deadline.quantity).toBeNull();
    expect(input.prediction!.suggestion.act_type).toBe("manifestacao_generica");
    expect(host.textContent).toContain("Resposta submetida");
  });
  it("renders no suggestion controls in blind mode even if unexpected data is supplied", async () => {
    input.assignment = {
      ...input.assignment,
      mode: "blind",
      prediction_id: null,
    };
    await mount();
    await click("Adicionar ato");
    expect(host.querySelector("[aria-label='Sugestão original']")).toBeNull();
    expect(host.textContent).not.toContain("Aplicar o tipo sugerido");
    expect(host.textContent).not.toContain("Aplicar este prazo");
    expect(host.querySelector<HTMLSelectElement>("#act-type-0")!.value).toBe(
      "",
    );
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("removes only the chosen act and preserves the remaining fields", async () => {
    await mount();
    await click("Adicionar ato");
    await click("Adicionar ato");
    await choose("act-type-0", "manifestacao_generica");
    await choose("act-type-1", "ciencia");
    await choose("recipient-1", "court");
    await click("Remover ato 1");
    expect(host.querySelector<HTMLSelectElement>("#act-type-0")!.value).toBe(
      "ciencia",
    );
    expect(host.querySelector<HTMLSelectElement>("#recipient-0")!.value).toBe(
      "court",
    );
    expect(host.querySelector("#act-type-1")).toBeNull();
  });
});
