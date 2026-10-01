"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import { goldError, withdrawalSchema } from "../../services/annotation-gold";
import {
  type DatasetRelease,
  type DownloadCommand,
  type PublicationJob,
  publishRelease,
  withdrawRelease,
} from "../../services/dataset-releases";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
import { useDatasetTransfer } from "./use-dataset-transfer";
type ReleaseCommand =
  | {
      kind: "publish";
      id: string;
      body: { request_id: string; expected_manifest_digest: string };
    }
  | {
      kind: "withdraw";
      id: string;
      body: { request_id: string; reason: string };
    }
  | { kind: "download"; input: DownloadCommand };
const schema = z.strictObject({
  publish: z.boolean(),
  download: z.boolean(),
  withdraw: z.boolean(),
  reason: z.string(),
});
export function useReleaseCommands(
  release: DatasetRelease,
  jobs: PublicationJob[],
  allowed: boolean,
  loading: boolean,
) {
  const transfer = useDatasetTransfer();
  async function send(api: ApiFetcher, command: ReleaseCommand) {
    if (command.kind === "publish")
      return {
        kind: "publish" as const,
        job: await publishRelease(api, command.id, command.body),
      };
    if (command.kind === "withdraw")
      return {
        kind: "withdraw" as const,
        release: await withdrawRelease(api, command.id, command.body),
      };
    return {
      kind: "download" as const,
      receipt: await transfer(command.input),
    };
  }
  const write = useCurationWrite(allowed, send, ["curation"]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      publish: false,
      download: false,
      withdraw: false,
      reason: "",
    },
  });
  const [message, setMessage] = useState<string | null>(null);
  const locked =
    !allowed || loading || write.mutation.isPending || write.uncertain;
  const available = jobs.find((j) => j.available && j.publication !== null);
  const hasExportableCases =
    release.manifest.included_count > release.manifest.split_counts.test;
  const canPublish =
    release.eligible &&
    hasExportableCases &&
    !release.withdrawn &&
    jobs.length < 8 &&
    !jobs.some((j) => ["queued", "running", "published"].includes(j.state));
  const navigation = useAnnotationNavigation(
    write.uncertain || write.mutation.isPending || form.formState.isDirty,
  );
  async function run(command: ReleaseCommand) {
    try {
      setMessage(null);
      const result = await write.run(command);
      if (result) {
        form.reset({
          ...form.getValues(),
          publish: false,
          download: false,
          withdraw: false,
        });
      }
    } catch (e) {
      setMessage(goldError(e));
    }
  }
  async function publish() {
    if (locked || write.isBusy() || !canPublish) return;
    if (!form.getValues("publish")) {
      setMessage("Confirme a publicação do dataset conferido.");
      return;
    }
    await run({
      kind: "publish",
      id: release.id,
      body: {
        request_id: crypto.randomUUID(),
        expected_manifest_digest: release.manifest_digest,
      },
    });
  }
  async function download() {
    if (
      locked ||
      write.isBusy() ||
      !release.eligible ||
      !hasExportableCases ||
      !available?.publication
    )
      return;
    if (!form.getValues("download")) {
      setMessage("Confirme a exposição aos gabaritos antes de baixar.");
      return;
    }
    await run({
      kind: "download",
      input: {
        release_id: release.id,
        request_id: crypto.randomUUID(),
        expected_manifest_digest: release.manifest_digest,
        publication: available.publication,
      },
    });
  }
  async function withdraw(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || write.isBusy() || release.withdrawn) return;
    try {
      const f = withdrawalSchema.parse({
        reason: form.getValues("reason"),
        confirmed: form.getValues("withdraw"),
      });
      await run({
        kind: "withdraw",
        id: release.id,
        body: { request_id: crypto.randomUUID(), reason: f.reason },
      });
    } catch (e) {
      setMessage(goldError(e));
    }
  }
  async function recover() {
    try {
      setMessage(null);
      const result = await write.recover();
      if (result)
        form.reset({
          ...form.getValues(),
          publish: false,
          download: false,
          withdraw: false,
        });
    } catch (e) {
      setMessage(goldError(e));
    }
  }
  function changeReason() {
    form.setValue("withdraw", false);
  }
  return {
    form,
    write,
    message,
    locked,
    canPublish,
    canDownload: release.eligible && hasExportableCases && !!available,
    navigation,
    publish,
    download,
    withdraw,
    recover,
    changeReason,
  };
}
