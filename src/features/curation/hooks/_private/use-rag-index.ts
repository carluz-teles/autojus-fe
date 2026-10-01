"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import type { DatasetRelease } from "../../services/dataset-releases";
import {
  buildRAGIndex,
  currentRAGIndex,
  getRAGAvailability,
  ragConfirmationSchema,
  ragKeys,
} from "../../services/rag";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";

export function useRAGIndexState(
  release: DatasetRelease,
  allowed: boolean,
  loading: boolean,
) {
  const api = useApi(),
    [message, setMessage] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ragKeys.release(release.id),
    queryFn: ({ signal }) => getRAGAvailability(api, release.id, signal),
    enabled: allowed,
    retry: false,
  });
  const write = useCurationWrite(allowed, buildRAGIndex, ragKeys.all);
  const form = useForm<z.infer<typeof ragConfirmationSchema>>({
    resolver: zodResolver(ragConfirmationSchema),
    defaultValues: { confirmed: false },
  });
  const index = currentRAGIndex(query.data);
  const locked = loading || write.mutation.isPending || write.uncertain;
  const canBuild =
    allowed &&
    !locked &&
    !query.isError &&
    !query.isFetching &&
    query.data?.enabled === true &&
    release.eligible &&
    !release.withdrawn &&
    release.manifest.purpose === "rag" &&
    release.manifest.split_counts.validation === 0 &&
    release.manifest.split_counts.test === 0 &&
    (!index ||
      (index.state === "building" && index.embedding_state === "ready"));
  const navigation = useAnnotationNavigation(
    write.uncertain || write.mutation.isPending || form.formState.isDirty,
  );
  const submit = form.handleSubmit(async (values) => {
    if (!canBuild || write.isBusy()) return;
    if (!values.confirmed) {
      setMessage("Confirme o dataset e o consumo limitado de embeddings.");
      return;
    }
    setMessage(null);
    try {
      const r = await write.run({
        release: release.id,
        body: {
          expected_manifest_digest: release.manifest_digest,
          confirmed: true,
          max_input_bytes: 131072,
        },
      });
      if (r) form.reset();
    } catch {
      /* Exact command retained by shared hook. */
    }
  });
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      if (await write.recover()) form.reset();
    } catch {
      /* Keep recovery visible. */
    }
  }
  function refresh() {
    if (allowed && !write.isBusy()) void query.refetch();
  }
  return {
    allowed,
    query,
    index,
    write,
    form,
    message,
    locked,
    canBuild,
    navigation,
    submit,
    recover,
    refresh,
  };
}
