"use client";

import { type MouseEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import type { OpenDocument } from "../../components/pdf-drawer";
import { rotuloTipoAuto } from "../../lib/tipo-autos";
import type { AutosNode, DocumentView } from "../../types";
import { useBaixarDocumento } from "../use-baixar-documento";

export function useAutosTreeSelection(
  nodes: AutosNode[],
  setOpenDocument: (doc: OpenDocument | null) => void,
) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DocumentView | null>(
    null,
  );
  const baixar = useBaixarDocumento();
  const documents = useMemo(() => {
    const map = new Map<string, DocumentView>();
    nodes.forEach((node) =>
      node.documents.forEach((doc) => map.set(doc.id, doc)),
    );
    return map;
  }, [nodes]);
  const selected =
    (selectedId && documents.get(selectedId)) || selectedSnapshot;
  const allVisibleExpanded =
    nodes.filter((node) => node.kind === "event").length > 0 &&
    nodes
      .filter((node) => node.kind === "event")
      .every((node) => expanded.has(node.id));

  function onEventToggle(event: MouseEvent<HTMLButtonElement>) {
    const id = event.currentTarget.value;
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleEvents() {
    setExpanded((current) => {
      const next = new Set(current);
      nodes
        .filter((node) => node.kind === "event")
        .forEach((node) => {
          if (allVisibleExpanded) next.delete(node.id);
          else next.add(node.id);
        });
      return next;
    });
  }

  function onDocumentSelect(event: MouseEvent<HTMLButtonElement>) {
    const doc = documents.get(event.currentTarget.value);
    if (!doc) return;
    setSelectedId(doc.id);
    setSelectedSnapshot(doc);
    openDocument(doc);
  }

  function openSelected() {
    if (selected) openDocument(selected);
  }

  function openDocument(doc: DocumentView) {
    if (doc.status === "PENDING") return;
    const mime = doc.mime_type?.split(";")[0].trim().toLowerCase();
    const previewable =
      !mime ||
      [
        "application/pdf",
        "pdf",
        "text/html",
        "application/xhtml+xml",
        "html",
        "htm",
      ].includes(mime) ||
      /\.(pdf|html?)$/i.test(doc.original_filename || doc.title);
    if (!previewable) {
      baixar.mutate(doc.id);
      return;
    }
    setOpenDocument({
      id: doc.id,
      titulo: rotuloTipoAuto(doc.document_type),
      meta: doc.court_reference
        ? `Evento ${doc.court_reference.event_number}, documento ${doc.court_reference.document_code}`
        : "Sem evento confirmado",
    });
  }

  const reference = selected?.court_reference
    ? `Evento ${selected.court_reference.event_number}, documento ${selected.court_reference.document_code}`
    : null;

  async function copyReference() {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      toast.success("Referência processual copiada.");
    } catch {
      toast.error("Não foi possível copiar a referência.");
    }
  }

  return {
    expanded,
    selectedId,
    selected,
    reference,
    allVisibleExpanded,
    onEventToggle,
    toggleVisibleEvents,
    onDocumentSelect,
    openSelected,
    copyReference,
    downloading: baixar.isPending,
  };
}
