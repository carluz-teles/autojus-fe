"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  type BaseSyntheticEvent,
  type ChangeEvent,
  useEffect,
  useRef,
} from "react";
import { useForm, useWatch } from "react-hook-form";

import { useApi } from "@/lib/api/use-api";

import {
  type ImportForm,
  importFormSchema,
  importItemsJSON,
} from "../../services/import-form";
import {
  buildImportBody,
  readImportFile,
  stageImport,
} from "../../services/imports";

export function useImportForm() {
  const api = useApi(),
    queryClient = useQueryClient(),
    router = useRouter();
  const form = useForm<ImportForm>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      name: "",
      mode: "manual",
      text: "",
      origin: "",
      source_reference: "",
      captured_at: "",
      group_key: "",
      court: "",
      procedure: "",
      channel: "",
      structured_text: "",
    },
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const attempt = useRef<{ input: string; request: string } | null>(null);
  const fileGeneration = useRef(0);
  useEffect(
    () => () => {
      fileGeneration.current++;
    },
    [],
  );
  const mutation = useMutation({
    mutationFn: (body: string) => stageImport(api, body),
    retry: false,
    onSuccess: (receipt) => {
      queryClient.setQueryData(
        ["curation", "import", receipt.batch.id],
        receipt.batch,
      );
      void queryClient.invalidateQueries({ queryKey: ["curation", "imports"] });
      router.push(`/backoffice/imports/${receipt.batch.id}`);
    },
  });
  async function persist(values: ImportForm) {
    try {
      const items = importItemsJSON(values),
        input = JSON.stringify([values.name, items]);
      if (attempt.current?.input !== input)
        attempt.current = { input, request: crypto.randomUUID() };
      const body = buildImportBody(attempt.current.request, values.name, items);
      await mutation.mutateAsync(body);
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível importar. Seu texto foi preservado.",
      });
    }
  }
  function submit(event?: BaseSyntheticEvent) {
    return form.handleSubmit(persist)(event);
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0],
      generation = ++fileGeneration.current;
    if (!file) return;
    try {
      const content = await readImportFile(file);
      if (generation !== fileGeneration.current) return;
      form.setValue("structured_text", content, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch {
      if (generation !== fileGeneration.current) return;
      form.setError("structured_text", {
        message: "Use um arquivo JSON UTF-8 válido, não vazio, de até 2 MiB.",
      });
    }
  }
  return { form, mode, submit, chooseFile, pending: mutation.isPending };
}
