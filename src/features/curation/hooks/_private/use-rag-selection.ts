"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import type { PreparedTask } from "../../services/annotation-preparation";
import { listReleases, releaseKeys } from "../../services/dataset-releases";
import {
  currentRAGIndex,
  getRAGAvailability,
  ragKeys,
  searchRAG,
} from "../../services/rag";
import { useCurationWrite } from "./use-curation-write";

const schema = z.strictObject({ release: z.string(), confirmed: z.boolean() });
export function useRAGSelection(
  task: PreparedTask,
  enabled: boolean,
  parentLocked: boolean,
) {
  const api = useApi(),
    [message, setMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { release: "", confirmed: false },
  });
  const selected = useWatch({ control: form.control, name: "release" });
  const releases = useInfiniteQuery({
    queryKey: [...releaseKeys.all, "list"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => listReleases(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled,
    retry: false,
  });
  const items =
    releases.data?.pages
      .flatMap((p) => p.data)
      .filter((r) => r.purpose === "rag" && !r.withdrawn) ?? [];
  const availability = useQuery({
    queryKey: ragKeys.release(selected),
    queryFn: ({ signal }) => getRAGAvailability(api, selected, signal),
    enabled: enabled && !!selected,
    retry: false,
  });
  const index = currentRAGIndex(availability.data);
  const write = useCurationWrite(enabled, searchRAG, ragKeys.all);
  const received = write.mutation.data;
  const result =
    enabled &&
    received?.release_id === selected &&
    received.task_id === task.id &&
    received.snapshot_digest === task.snapshot_digest &&
    !write.mutation.isError &&
    !availability.isError &&
    index?.eligible === true
      ? received
      : undefined;
  const locked = parentLocked || write.mutation.isPending || write.uncertain;
  const available =
    enabled &&
    !releases.isError &&
    !availability.isError &&
    !availability.isFetching &&
    availability.data?.enabled === true &&
    index?.eligible === true &&
    index.state === "ready" &&
    items.some((r) => r.id === selected);
  const selectionReady =
    !selected ||
    !!(
      available &&
      result &&
      (result.state === "ready" || result.state === "empty")
    );
  const canSearch = available && !locked && !result;
  function changeRelease(e: ChangeEvent<HTMLSelectElement>) {
    if (locked) return;
    form.reset({ release: e.target.value, confirmed: false });
    write.mutation.reset();
    setMessage(null);
  }
  async function search() {
    if (!canSearch || write.isBusy()) return;
    if (!form.getValues("confirmed")) {
      setMessage("Confirme a busca e a exposição aos exemplos revisados.");
      return;
    }
    setMessage(null);
    try {
      const r = await write.run({
        index: index!.id,
        release: selected,
        body: {
          request_id: crypto.randomUUID(),
          task_id: task.id,
          expected_snapshot_digest: task.snapshot_digest,
          confirmed: true,
          max_input_bytes: 131072,
          top_k: 3,
        },
      });
      if (r) form.reset({ release: selected, confirmed: false });
    } catch {
      /* Preserve exact command on uncertain delivery. */
    }
  }
  async function recover() {
    if (!enabled || write.isBusy()) return;
    try {
      if (await write.recover())
        form.reset({ release: selected, confirmed: false });
    } catch {
      /* Keep recovery visible. */
    }
  }
  async function inspectAttempt() {
    if (!enabled || locked || !write.mutation.variables) return;
    try {
      await write.run(write.mutation.variables);
    } catch {
      /* Same request and embedding receipt. */
    }
  }
  function reset() {
    if (locked) return;
    form.reset();
    write.mutation.reset();
    setMessage(null);
  }
  function more() {
    if (enabled && !releases.isFetching) void releases.fetchNextPage();
  }
  function refresh() {
    if (enabled && !locked) {
      void releases.refetch();
      if (selected) void availability.refetch();
    }
  }
  return {
    enabled,
    form,
    selected,
    items,
    releases,
    availability,
    index,
    result,
    write,
    locked,
    selectionReady,
    canSearch,
    search,
    recover,
    inspectAttempt,
    changeRelease,
    reset,
    more,
    refresh,
    message,
  };
}
