// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { useAutosTreeSelection } from "../hooks/_private/use-autos-tree-selection";
import type { AutosTreeState } from "../hooks/use-autos-tree";
import type { AutosNode, DocumentView } from "../types";
import { AutosTree } from "./autos-tree";

vi.mock("../hooks/use-baixar-documento", () => ({
  useBaixarDocumento: () => ({ isPending: false, mutate: vi.fn() }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const document = (n: number, mapped = true): DocumentView => ({
  id: `doc-${n}`,
  court_record_id: "record-1",
  document_type: "OUTROS",
  origin: mapped ? "COURT" : "UPLOAD",
  title: `Documento ${n}`,
  created_at: "2026-09-29T12:00:00Z",
  status: "READY",
  has_text_layer: true,
  court_document_code: mapped ? `DOC${n}` : undefined,
  court_reference: mapped
    ? { event_number: 42, document_code: `DOC${n}` }
    : undefined,
});

function state(
  nodes: AutosNode[],
  expanded = new Set<string>(),
): AutosTreeState {
  return {
    nodes,
    expanded,
    selectedId: null,
    selected: null,
    reference: null,
    search: "",
    order: "newest",
    total: 62,
    filteredTotal: 62,
    filteredNodes: 2,
    allVisibleExpanded: expanded.has("event-42"),
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    downloading: false,
    onSearchChange: vi.fn(),
    toggleOrder: vi.fn(),
    toggleVisibleEvents: vi.fn(),
    onEventToggle: vi.fn(),
    onDocumentSelect: vi.fn(),
    retry: vi.fn(),
    loadMore: vi.fn(),
    copyReference: vi.fn(),
    openSelected: vi.fn(),
  } as AutosTreeState;
}

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

it("keeps a 60+ document event compact until expanded", () => {
  host = window.document.createElement("div");
  window.document.body.append(host);
  root = createRoot(host);
  const nodes: AutosNode[] = [
    {
      kind: "event",
      id: "event-42",
      event_number: 42,
      description: "Juntada de documentos",
      documents: Array.from({ length: 60 }, (_, i) => document(i + 1)),
    },
    { kind: "unmapped", id: "doc-61", documents: [document(61, false)] },
  ];
  act(() => root?.render(<AutosTree autos={state(nodes)} />));
  expect(host.textContent).toContain(
    "Esta árvore mostra somente eventos do EPROC que possuem documentos.",
  );
  expect(host.textContent).toContain(
    "Eventos que não geraram documento não aparecem aqui.",
  );
  const eventButton = host.querySelector<HTMLButtonElement>(
    'button[aria-expanded="false"]',
  );
  expect(eventButton?.getAttribute("aria-expanded")).toBe("false");
  expect(host.querySelectorAll('button[value^="doc-"]')).toHaveLength(0);
  expect(host.textContent).toContain("Sem evento confirmado");
  expect(host.textContent).toContain("62 de 62 documentos");
  act(() =>
    root?.render(<AutosTree autos={state(nodes, new Set(["event-42"]))} />),
  );
  expect(host.querySelectorAll('button[value^="doc-"]')).toHaveLength(60);
  expect(eventButton?.getAttribute("aria-expanded")).toBe("true");
  expect(eventButton?.getAttribute("aria-controls")).toBe("autos-event-42");
  expect(host.querySelector('button[value="doc-60"]')?.textContent).toContain(
    "DOC60",
  );
});

it("shows deterministic portal metadata and uses the document type as the child name", () => {
  host = window.document.createElement("div");
  window.document.body.append(host);
  root = createRoot(host);
  const petition = {
    ...document(1),
    document_type: "PET",
    title: "Juntada",
    pages: 2,
  };
  const nodes: AutosNode[] = [
    {
      kind: "event",
      id: "event-42",
      event_number: 42,
      description: "Juntada",
      detail: "Petição intermediária",
      actor: "Secretaria da Vara",
      documents: [petition],
    },
  ];
  act(() =>
    root?.render(<AutosTree autos={state(nodes, new Set(["event-42"]))} />),
  );
  expect(host.textContent).toContain("Petição intermediária");
  expect(host.textContent).toContain("Secretaria da Vara");
  const row = host.querySelector<HTMLButtonElement>('button[value="doc-1"]');
  expect(row?.textContent).toContain("Petição");
  expect(row?.textContent).not.toContain("Juntada");
  expect(row?.textContent).toContain("DOC1");
  expect(row?.textContent).toContain("2 páginas");
});

it("bounds long portal details without generating a summary", () => {
  host = window.document.createElement("div");
  window.document.body.append(host);
  root = createRoot(host);
  const longDetail = `Vistos. ${"Fundamento legal e determinação judicial. ".repeat(12)}`;
  const nodes: AutosNode[] = [
    {
      kind: "event",
      id: "event-97",
      event_number: 97,
      description: "Deferido o pedido",
      detail: longDetail,
      documents: [document(1)],
    },
  ];
  act(() => root?.render(<AutosTree autos={state(nodes)} />));
  expect(host.textContent).toContain("Vistos.");
  expect(host.textContent).toContain("…");
  expect(host.textContent).not.toContain(longDetail);
});

it("merges unmapped records from successive pages into one expandable group", () => {
  host = window.document.createElement("div");
  window.document.body.append(host);
  root = createRoot(host);
  const firstPage: AutosNode[] = [
    { kind: "unmapped", id: "doc-61", documents: [document(61, false)] },
  ];
  act(() => root?.render(<AutosTree autos={state(firstPage)} />));
  expect(host.querySelectorAll('button[value="autos-unmapped"]')).toHaveLength(
    1,
  );
  const secondPage: AutosNode[] = [
    ...firstPage,
    { kind: "unmapped", id: "doc-62", documents: [document(62, false)] },
  ];
  act(() =>
    root?.render(
      <AutosTree autos={state(secondPage, new Set(["autos-unmapped"]))} />,
    ),
  );
  expect(host.querySelectorAll('button[value="autos-unmapped"]')).toHaveLength(
    1,
  );
  expect(host.textContent?.match(/Sem evento confirmado/g)).toHaveLength(1);
  expect(host.textContent).toContain("2 documentos carregados");
  expect(host.querySelectorAll('button[value^="doc-"]')).toHaveLength(2);
  expect(
    host
      .querySelector('button[value="autos-unmapped"]')
      ?.getAttribute("aria-expanded"),
  ).toBe("true");
});

it("opens a document directly from a row after selection, including deep in a 60+ group", () => {
  host = window.document.createElement("div");
  window.document.body.append(host);
  root = createRoot(host);
  const nodes: AutosNode[] = [
    {
      kind: "event",
      id: "event-42",
      event_number: 42,
      documents: Array.from({ length: 60 }, (_, i) => document(i + 1)),
    },
    { kind: "unmapped", id: "doc-61", documents: [document(61, false)] },
  ];
  const open = vi.fn();
  function Harness() {
    const selection = useAutosTreeSelection(nodes, open);
    return <AutosTree autos={{ ...state(nodes), ...selection }} />;
  }
  act(() => root?.render(<Harness />));
  expect(host.textContent).not.toContain("Fonte selecionada");
  expect(host.querySelector('aside[aria-label="Documento selecionado"]')).toBe(
    null,
  );
  act(() =>
    host?.querySelector<HTMLButtonElement>('button[value="event-42"]')?.click(),
  );
  const row = host.querySelector<HTMLButtonElement>('button[value="doc-60"]');
  expect(row?.getAttribute("aria-label")).toBe("Abrir documento Outros");
  act(() => row?.click());
  expect(open).toHaveBeenCalledWith({
    id: "doc-60",
    titulo: "Outros",
    meta: "Evento 42, documento DOC60",
  });
  expect(
    host.querySelector('button[value="doc-60"]')?.getAttribute("aria-current"),
  ).toBe("true");
  act(() =>
    host
      ?.querySelector<HTMLButtonElement>('button[value="autos-unmapped"]')
      ?.click(),
  );
  act(() =>
    host?.querySelector<HTMLButtonElement>('button[value="doc-61"]')?.click(),
  );
  expect(open).toHaveBeenLastCalledWith({
    id: "doc-61",
    titulo: "Outros",
    meta: "Sem evento confirmado",
  });
});
