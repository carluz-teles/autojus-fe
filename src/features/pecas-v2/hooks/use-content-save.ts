"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api/use-api";

import { ContentSaveQueue, type SaveState } from "../lib/content-save-queue";
import type { Draft } from "../types";
import { draftKeys } from "./use-draft";

export function useContentSave(id: string, draft: Draft | undefined) {
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
    if (
      draft?.contentRevision &&
      !queue.revision &&
      draft.sagaState !== "EXTRACTING" &&
      draft.sagaState !== "CREATED"
    )
      queue.acknowledge(draft.contentRevision);
  }, [draft?.contentRevision, draft?.sagaState, queue]);
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
