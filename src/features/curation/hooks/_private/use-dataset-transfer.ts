"use client";
import { useEffect, useRef } from "react";

import { useApiBinary } from "@/lib/api/use-api";

import {
  type DownloadCommand,
  downloadDataset,
} from "../../services/dataset-releases";
export function useDatasetTransfer() {
  const api = useApiBinary(),
    controller = useRef<AbortController | null>(null),
    mounted = useRef(true),
    urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    mounted.current = true;
    const owned = urls.current;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      for (const [url, timer] of owned) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      owned.clear();
    };
  }, []);
  async function transfer(command: DownloadCommand) {
    if (!mounted.current)
      throw new DOMException("Transfer cancelled", "AbortError");
    const request = new AbortController();
    controller.current = request;
    try {
      const { blob, ...receipt } = await downloadDataset(
        api,
        command,
        request.signal,
      );
      request.signal.throwIfAborted();
      if (!mounted.current)
        throw new DOMException("Transfer cancelled", "AbortError");
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = receipt.filename;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
        urls.current.set(
          url,
          setTimeout(() => {
            URL.revokeObjectURL(url);
            urls.current.delete(url);
          }, 1000),
        );
      }
      return receipt;
    } finally {
      if (controller.current === request) controller.current = null;
    }
  }
  return transfer;
}
