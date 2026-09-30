"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getDocumentTemplateDefault } from "@/features/document-templates/services/document-templates.service";
import { ApiError } from "@/lib/api/errors";
import { useApi, usePresignedStorage } from "@/lib/api/use-api";
import { subscribeTransition } from "@/lib/auth/organization-transition";

import * as svc from "../../services/pecas-v2.service";
import type { Draft } from "../../types";
import { draftKeys } from "../use-draft";

type PdfArtifact = { blob: Blob; renderId: string | null; downloadURL: string };
type Intent = { fingerprint: string; key: string; templateVersionId: string };
type SourceSnapshot = {
  before: string | null;
  ack: string | null;
  saved: string | null;
  sawAck: boolean;
  sawSaved: boolean;
};

function draftFingerprint(draft: Draft) {
  return JSON.stringify([
    draft.currentVersionId,
    draft.contentRevision,
    draft.contentHtml,
    draft.updatedAt,
    draft.pieceType,
    draft.process,
    draft.parties,
    draft.preamble,
    draft.sections,
    draft.qualityAuthorization,
  ]);
}

function matchesSource(snapshot: SourceSnapshot, fingerprint: string | null) {
  if (snapshot.saved === null) return true;
  if (fingerprint === snapshot.saved) {
    snapshot.sawSaved = true;
    return true;
  }
  if (
    !snapshot.sawSaved &&
    snapshot.ack !== null &&
    fingerprint === snapshot.ack
  ) {
    snapshot.sawAck = true;
    return true;
  }
  return (
    !snapshot.sawSaved &&
    !snapshot.sawAck &&
    snapshot.before !== null &&
    fingerprint === snapshot.before
  );
}

function directedRenderConflict(error: unknown, id: string) {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const details = error.details;
  return (
    typeof details === "object" &&
    details !== null &&
    "next_method" in details &&
    details.next_method === "POST" &&
    "next_path" in details &&
    details.next_path === `/v1/pecas/${id}/renders`
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return null;
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível preparar o PDF. Tente novamente.";
}

export function usePdfExport(
  id: string,
  draft: Draft | undefined,
  flush: () => Promise<unknown>,
) {
  const { orgId } = useAuth();
  const fetcher = useApi();
  const storage = usePresignedStorage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const intent = useRef<Intent | null>(null);
  const active = useRef<AbortController | null>(null);
  const objectURL = useRef<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const source = useRef<SourceSnapshot | null>(null);
  const latestDraft = useRef<Draft | undefined>(draft);
  const artifactKey = ["pecas-v2", "pdf-artifact", orgId, id] as const;
  const artifact = useQuery<PdfArtifact>({
    queryKey: artifactKey,
    queryFn: () => Promise.reject(new Error("PDF ainda não preparado")),
    enabled: false,
  }).data;

  const invalidate = useCallback(() => {
    generation.current++;
    active.current?.abort();
    active.current = null;
    busy.current = false;
    setPending(false);
    setOpen(false);
    intent.current = null;
    source.current = null;
    if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    objectURL.current = null;
    qc.removeQueries({
      queryKey: ["pecas-v2", "pdf-artifact", orgId, id],
      exact: true,
    });
  }, [qc, orgId, id]);
  useEffect(() => {
    const unsubscribe = subscribeTransition(invalidate);
    return () => {
      unsubscribe();
      invalidate();
    };
    // Key changes when the active office or draft changes.
  }, [invalidate]);

  useEffect(() => {
    latestDraft.current = draft;
    if (!source.current) return;
    if (!matchesSource(source.current, draft ? draftFingerprint(draft) : null))
      invalidate();
  }, [draft, invalidate]);

  const exportPDF = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    const request = new AbortController();
    active.current = request;
    const started = generation.current;
    const organization = orgId;
    const atStart = draft ? draftFingerprint(draft) : null;
    source.current = {
      before: atStart,
      ack: null,
      saved: null,
      sawAck: false,
      sawSaved: false,
    };
    const current = () =>
      !request.signal.aborted &&
      generation.current === started &&
      orgId === organization;
    try {
      await flush();
      if (!current()) return;
      const acknowledged = qc.getQueryData<Draft>(draftKeys.detail(id));
      if (source.current && acknowledged)
        source.current.ack = draftFingerprint(acknowledged);
      const fresh = await svc.getDraft(fetcher, id);
      if (!current()) return;
      const fingerprint = draftFingerprint(fresh);
      if (source.current) source.current.saved = fingerprint;
      if (
        !source.current ||
        !matchesSource(
          source.current,
          latestDraft.current ? draftFingerprint(latestDraft.current) : null,
        )
      ) {
        invalidate();
        return;
      }
      const signed = fresh.status === "SIGNED" || fresh.status === "FILED";
      let blob: Blob;
      let renderId: string | null = null;
      if (signed) {
        if (!fresh.signedPDFURL) throw new Error("PDF assinado indisponível.");
        try {
          blob = await storage.getBlob(fresh.signedPDFURL, request.signal);
        } catch (error) {
          if (!current()) throw error;
          const refreshed = await svc.getDraft(fetcher, id);
          if (
            !refreshed.signedPDFURL ||
            (refreshed.status !== "SIGNED" && refreshed.status !== "FILED")
          )
            throw error;
          blob = await storage.getBlob(refreshed.signedPDFURL, request.signal);
        }
      } else {
        const previous =
          intent.current?.fingerprint === fingerprint ? intent.current : null;
        const template = previous
          ? null
          : await qc.fetchQuery({
              queryKey: ["document-template-default", organization],
              queryFn: ({ signal }) =>
                getDocumentTemplateDefault(fetcher, signal),
              staleTime: 0,
            });
        if (!current()) return;
        let url: string;
        if (previous || template) {
          const selected = previous ?? {
            fingerprint,
            templateVersionId: template!.version_id,
            key: crypto.randomUUID(),
          };
          intent.current = selected;
          const render = await svc.renderDraftPDF(
            fetcher,
            id,
            selected.templateVersionId,
            selected.key,
          );
          if (render.status !== "READY" || !render.pdf_url)
            throw new Error(
              render.diagnostic ||
                "A renderização ainda não está disponível. Tente novamente.",
            );
          renderId = render.id;
          url = render.pdf_url;
        } else {
          try {
            url = await svc.exportDraftPDF(fetcher, id);
          } catch (error) {
            if (!directedRenderConflict(error, id)) throw error;
            const refreshed = await getDocumentTemplateDefault(
              fetcher,
              request.signal,
            );
            if (!refreshed) throw error;
            const selected =
              intent.current?.fingerprint === fingerprint
                ? intent.current
                : {
                    fingerprint,
                    templateVersionId: refreshed.version_id,
                    key: crypto.randomUUID(),
                  };
            intent.current = selected;
            const render = await svc.renderDraftPDF(
              fetcher,
              id,
              selected.templateVersionId,
              selected.key,
            );
            if (render.status !== "READY" || !render.pdf_url)
              throw new Error(
                render.diagnostic ||
                  "A renderização ainda não está disponível. Tente novamente.",
              );
            renderId = render.id;
            url = render.pdf_url;
          }
        }
        if (!current()) return;
        try {
          blob = await storage.getBlob(url, request.signal);
        } catch (error) {
          if (!renderId || !current()) throw error;
          const refreshed = await svc.getDocumentRender(fetcher, renderId);
          if (!refreshed.pdf_url) throw error;
          blob = await storage.getBlob(refreshed.pdf_url, request.signal);
        }
      }
      if (!current()) return;
      if (
        !source.current ||
        !matchesSource(
          source.current,
          latestDraft.current ? draftFingerprint(latestDraft.current) : null,
        )
      ) {
        invalidate();
        return;
      }
      if (objectURL.current) URL.revokeObjectURL(objectURL.current);
      const downloadURL = URL.createObjectURL(blob);
      objectURL.current = downloadURL;
      qc.setQueryData<PdfArtifact>(artifactKey, {
        blob,
        renderId,
        downloadURL,
      });
      setOpen(true);
    } catch (error) {
      if (current()) {
        const message = errorMessage(error);
        if (message) toast.error(message);
      }
    } finally {
      if (generation.current === started) {
        busy.current = false;
        active.current = null;
        setPending(false);
      }
    }
  };

  return {
    artifact,
    downloadURL: artifact?.downloadURL ?? null,
    open,
    setOpen,
    pending,
    exportPDF,
    invalidate,
  };
}
