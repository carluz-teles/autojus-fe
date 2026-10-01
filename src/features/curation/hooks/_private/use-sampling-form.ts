"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type BaseSyntheticEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useApi } from "@/lib/api/use-api";

import { isUncertainCommandFailure } from "../../services/command-recovery";
import {
  eligibleSamplingSources,
  freezeSample,
  type SamplingForm,
  samplingFormSchema,
  samplingFreezeBody,
  type SamplingPopulation,
} from "../../services/sampling";

export function useSamplingFormState(population: SamplingPopulation) {
  const api = useApi(),
    client = useQueryClient(),
    router = useRouter();
  const [page, setPage] = useState(0);
  const form = useForm<SamplingForm>({
    resolver: zodResolver(samplingFormSchema),
    defaultValues: {
      lineage_key: "",
      seed: "",
      origin: "",
      matter_key: "",
      sample_size: 100,
      population_digest: population.digest,
      screening: {},
    },
  });
  const [origin, matter, digest] = useWatch({
    control: form.control,
    name: ["origin", "matter_key", "population_digest"],
  });
  const eligible = eligibleSamplingSources(population, origin, matter),
    lastPage = Math.max(0, Math.ceil(eligible.length / 20) - 1),
    currentPage = Math.min(page, lastPage);
  const visible = eligible
    .slice(currentPage * 20, (currentPage + 1) * 20)
    .map((source, index) => ({
      ...source,
      number: currentPage * 20 + index + 1,
    }));
  const matters = Array.from(
    new Set(population.sources.map((source) => source.matter_key)),
  ).sort();
  const attempt = useRef<{ input: string; request: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (body: ReturnType<typeof samplingFreezeBody>) =>
      freezeSample(api, body),
    retry: false,
    onSuccess: (frame) => {
      void client.invalidateQueries({
        queryKey: ["curation", "sampling-frames"],
      });
      void client.invalidateQueries({
        queryKey: ["curation", "sampling-population"],
      });
      router.push(`/backoffice/sampling/${frame.id}`);
    },
  });
  async function persist(values: SamplingForm) {
    try {
      const body = samplingFreezeBody("", values, population),
        input = JSON.stringify(body);
      if (
        mutation.isError &&
        isUncertainCommandFailure(mutation.error) &&
        attempt.current?.input !== input
      )
        throw new Error(
          "Confirme o resultado do envio anterior antes de enviar alterações.",
        );
      if (attempt.current?.input !== input)
        attempt.current = { input, request: crypto.randomUUID() };
      body.request_id = attempt.current.request;
      await mutation.mutateAsync(body);
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao congelar. Sua triagem foi preservada.",
      });
    }
  }
  function submit(event?: BaseSyntheticEvent) {
    return form.handleSubmit(persist)(event);
  }
  async function recover() {
    if (!mutation.variables || mutation.isPending) return;
    try {
      await mutation.mutateAsync(mutation.variables);
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "O resultado do envio ainda não foi confirmado.",
      });
    }
  }
  function reconcile() {
    form.setValue("population_digest", population.digest, {
      shouldDirty: true,
    });
    form.clearErrors("root");
  }
  function previous() {
    setPage(Math.max(0, currentPage - 1));
  }
  function next() {
    setPage(Math.min(lastPage, currentPage + 1));
  }
  return {
    form,
    mutation,
    submit,
    recover,
    uncertain: mutation.isError && isUncertainCommandFailure(mutation.error),
    reconcile,
    outdated: digest !== population.digest,
    eligibleCount: eligible.length,
    visible,
    matters,
    previous,
    next,
    page: currentPage + 1,
    pageCount: lastPage + 1,
  };
}
