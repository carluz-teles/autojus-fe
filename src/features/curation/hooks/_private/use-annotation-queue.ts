"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { type MouseEvent, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import {
  annotationKeys,
  claimAnnotation,
  listAnnotationAssignments,
  listAnnotationBatches,
  listAnnotationQueue,
} from "../../services/annotation-assignments";
import { isUncertainCommandFailure } from "../../services/command-recovery";

const filtersSchema = z.strictObject({
  batch: z.string(),
  slot: z.enum(["0", "1", "2"]),
  availability: z.enum(["all", "available"]),
});
export function useAnnotationQueueState(allowed: boolean, initialBatch = "") {
  const api = useApi(),
    busy = useRef(false);
  const form = useForm<z.infer<typeof filtersSchema>>({
    resolver: zodResolver(filtersSchema),
    defaultValues: { batch: initialBatch, slot: "0", availability: "all" },
  });
  const [batch, slot, availability] = useWatch({
    control: form.control,
    name: ["batch", "slot", "availability"],
  });
  const batches = useInfiniteQuery({
    queryKey: [...annotationKeys.all, "batches"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listAnnotationBatches(api, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const queue = useInfiniteQuery({
    queryKey: [...annotationKeys.all, "queue", batch, slot],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listAnnotationQueue(api, batch, Number(slot), pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: allowed && !!batch,
    retry: false,
  });
  const own = useInfiniteQuery({
    queryKey: [...annotationKeys.all, "own"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listAnnotationAssignments(api, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const claimMutation = useMutation({
    mutationFn: (input: {
      task: string;
      body: { request_id: string; slot: number };
    }) => claimAnnotation(api, input.task, input.body),
    retry: false,
    // A document boundary makes browser Back invoke the questionnaire's
    // beforeunload guard instead of silently traversing a same-document route.
    onSuccess: (receipt) =>
      window.location.assign(`/backoffice/curation/${receipt.assignment.id}`),
  });
  const uncertain =
    claimMutation.isError && isUncertainCommandFailure(claimMutation.error);
  async function claim(event: MouseEvent<HTMLButtonElement>) {
    const task = event.currentTarget.dataset.task;
    if (!allowed || !task || busy.current || uncertain) return;
    busy.current = true;
    try {
      await claimMutation.mutateAsync({
        task,
        body: { request_id: crypto.randomUUID(), slot: Number(slot) },
      });
    } catch {
      /* The mutation retains its receipt request for explicit recovery. */
    } finally {
      busy.current = false;
    }
  }
  async function recover() {
    if (!claimMutation.variables || busy.current || !allowed) return;
    busy.current = true;
    try {
      await claimMutation.mutateAsync(claimMutation.variables);
    } catch {
      /* Preserve the same request and selected review slot. */
    } finally {
      busy.current = false;
    }
  }
  function refresh() {
    void batches.refetch();
    void own.refetch();
    if (batch) void queue.refetch();
  }
  function moreBatches() {
    void batches.fetchNextPage();
  }
  function moreTasks() {
    void queue.fetchNextPage();
  }
  function moreOwn() {
    void own.fetchNextPage();
  }
  const batchItems = batches.data?.pages.flatMap((page) => page.data) ?? [];
  const tasks = queue.data?.pages.flatMap((page) => page.data) ?? [];
  const ownItems = own.data?.pages.flatMap((page) => page.data) ?? [];
  return {
    form,
    batch,
    batches,
    batchItems,
    selectedBatch: batchItems.find((item) => item.id === batch),
    queue,
    own,
    ownItems,
    tasks:
      availability === "available"
        ? tasks.filter((task) => task.slot_available)
        : tasks,
    loadedCount: tasks.length,
    claimMutation,
    uncertain,
    claim,
    recover,
    refresh,
    moreBatches,
    moreTasks,
    moreOwn,
  };
}
