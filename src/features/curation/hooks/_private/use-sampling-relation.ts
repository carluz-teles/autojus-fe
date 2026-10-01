"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type BaseSyntheticEvent, useRef } from "react";
import { useForm } from "react-hook-form";

import { useApi } from "@/lib/api/use-api";

import {
  relateSamplingSources,
  type SamplingRelationForm,
  samplingRelationSchema,
} from "../../services/sampling";

export function useSamplingRelation() {
  const api = useApi(),
    client = useQueryClient();
  const form = useForm<SamplingRelationForm>({
    resolver: zodResolver(samplingRelationSchema),
    defaultValues: { left: "", right: "", reason: "" },
  });
  const attempt = useRef<{ input: string; request: string } | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      request,
      values,
    }: {
      request: string;
      values: SamplingRelationForm;
    }) => relateSamplingSources(api, request, values),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["curation", "sampling-frame"],
      });
      void client.invalidateQueries({
        queryKey: ["curation", "sampling-frames"],
      });
      void client.invalidateQueries({
        queryKey: ["curation", "sampling-population"],
      });
    },
  });
  async function persist(values: SamplingRelationForm) {
    try {
      const input = JSON.stringify(values);
      if (attempt.current?.input !== input)
        attempt.current = { input, request: crypto.randomUUID() };
      await mutation.mutateAsync({ request: attempt.current.request, values });
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a relação.",
      });
    }
  }
  function submit(event?: BaseSyntheticEvent) {
    return form.handleSubmit(persist)(event);
  }
  return { form, mutation, submit };
}
