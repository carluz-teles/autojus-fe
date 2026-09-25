"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api/use-api";

import { ContentSaveQueue, type SaveState } from "../lib/content-save-queue";
import { structuredToHtml } from "../lib/html-adapter";
import type { Draft } from "../types";
import { draftKeys } from "./use-draft";

export function useContentSave(
  id: string,
  draft: Draft | undefined,
  onHydrate?: (html: string) => void,
) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const [state, setState] = useState<SaveState>("saved");
  const [recovery, setRecovery] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(`peca-recovery:${id}`);
    } catch {
      return null;
    }
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseline = useRef<{
    version: string | null;
    revision: string;
    html: string;
    updatedAt: string;
    awaitingAckRead: boolean;
  } | null>(null);
  const onHydrateRef = useRef(onHydrate);
  useEffect(() => {
    onHydrateRef.current = onHydrate;
  }, [onHydrate]);
  const key = `peca-recovery:${id}`;
  const [queue] = useState(
    () =>
      new ContentSaveQueue(
        "",
        async (html, revision) => {
          const r = await fetcher<{ data: { revision: string } }>(
            `/v1/pecas/${id}/content-html`,
            { method: "PUT", body: { content_html: html, revision } },
          );
          // A GET started before this successful PUT cannot replace its ack.
          await qc.cancelQueries({
            queryKey: draftKeys.detail(id),
            exact: true,
          });
          return r.data.revision;
        },
        (next, html, revision) => {
          setState(next);
          if (next === "dirty" && html !== undefined && !revision) {
            try {
              sessionStorage.setItem(key, html);
            } catch {}
          }
          if (revision && html !== undefined) {
            qc.setQueryData<Draft>(draftKeys.detail(id), (d) =>
              d
                ? {
                    ...d,
                    contentHtml: html,
                    contentRevision: revision,
                    contentEdited: true,
                  }
                : d,
            );
          }
          if (next === "saved") {
            try {
              sessionStorage.removeItem(key);
            } catch {}
          }
        },
      ),
  );
  useEffect(() => {
    const saved = queue.lastSaved;
    if (
      saved &&
      saved.revision === queue.revision &&
      baseline.current &&
      baseline.current.revision !== saved.revision
    )
      baseline.current = {
        ...baseline.current,
        revision: saved.revision,
        html: saved.html,
        awaitingAckRead: true,
      };
    if (
      !draft?.contentRevision ||
      draft.sagaState === "EXTRACTING" ||
      draft.sagaState === "CREATED" ||
      queue.dirty ||
      queue.state === "error"
    )
      return;
    const html =
      draft.contentHtml ??
      structuredToHtml({ preamble: draft.preamble, sections: draft.sections });
    const previous = baseline.current;
    const oldTime = previous ? Date.parse(previous.updatedAt) : NaN;
    const nextTime = Date.parse(draft.updatedAt);
    if (
      previous?.revision === draft.contentRevision &&
      previous.version === draft.currentVersionId &&
      previous.html === html
    ) {
      if (Number.isFinite(nextTime) && nextTime > oldTime) {
        previous.updatedAt = draft.updatedAt;
        previous.awaitingAckRead = false;
      }
      return;
    }
    if (
      previous &&
      Number.isFinite(oldTime) &&
      Number.isFinite(nextTime) &&
      (nextTime < oldTime || (previous.awaitingAckRead && nextTime <= oldTime))
    )
      return;
    queue.acknowledge(draft.contentRevision);
    baseline.current = {
      version: draft.currentVersionId,
      revision: draft.contentRevision,
      html,
      updatedAt: draft.updatedAt,
      awaitingAckRead: false,
    };
    onHydrateRef.current?.(html);
  }, [draft, queue, state]);
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    return queue.flush();
  };
  const change = (html: string) => {
    queue.change(html);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void queue.flush().catch(() => {});
    }, 700);
  };
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (queue.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
      void queue.flush().catch(() => {});
    };
  }, [queue]);
  return {
    state,
    acknowledge: (revision: string) => {
      queue.acknowledge(revision);
    },
    change,
    flush,
    queue,
    recovery: draft && recovery !== draft.contentHtml ? recovery : null,
    discardRecovery: () => {
      setRecovery(null);
      try {
        sessionStorage.removeItem(key);
      } catch {}
    },
  };
}
