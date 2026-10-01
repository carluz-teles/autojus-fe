"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useRef, useState } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  canSelectImport,
  commandImport,
  getImport,
  type ImportCommand,
} from "../../services/imports";

export function useImportDetail(id: string, enabled: boolean) {
  const api = useApi(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["curation", "import", id],
    queryFn: ({ signal }) => getImport(api, id, signal),
    enabled,
    retry: false,
    staleTime: 0,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState("");
  const attempt = useRef<{ input: string; request: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (command: ImportCommand) => commandImport(api, id, command),
    retry: false,
    onSuccess: () => {
      setSelected({});
      // A replay returns its historical receipt. Always refetch current state.
      void client.invalidateQueries({ queryKey: ["curation", "import", id] });
      void client.invalidateQueries({ queryKey: ["curation", "imports"] });
    },
  });
  function toggle(event: ChangeEvent<HTMLInputElement>) {
    setSelected((previous) => ({
      ...previous,
      [event.target.value]: event.target.checked,
    }));
  }
  function changeReason(event: ChangeEvent<HTMLInputElement>) {
    setReasons((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }
  function changeCancelReason(event: ChangeEvent<HTMLTextAreaElement>) {
    setCancelReason(event.target.value);
  }
  function issue(action: "confirm" | "cancel") {
    if (!query.data || mutation.isPending || query.isFetching) return;
    const command = {
      expected_revision: query.data.revision,
      action,
      selection:
        action === "confirm"
          ? query.data.items
              .filter((item) => canSelectImport(item) && selected[item.id])
              .map((item) => ({
                item_id: item.id,
                duplicate_reason: reasons[item.id] ?? "",
              }))
          : [],
      reason: action === "cancel" ? cancelReason : "",
      request_id: "",
    };
    const input = JSON.stringify(command);
    if (attempt.current?.input !== input)
      attempt.current = { input, request: crypto.randomUUID() };
    command.request_id = attempt.current.request;
    mutation.mutate(command);
  }
  function confirm() {
    issue("confirm");
  }
  function cancel() {
    issue("cancel");
  }
  function refresh() {
    void query.refetch();
  }
  const rows =
    query.data?.items.map((item) => ({
      ...item,
      selectable: canSelectImport(item),
      selected: Boolean(selected[item.id]),
      duplicateReason: reasons[item.id] ?? "",
    })) ?? [];
  const selectedRows = rows.filter((row) => row.selectable && row.selected);
  const canConfirm =
    selectedRows.length > 0 &&
    selectedRows.every(
      (row) =>
        row.state !== "duplicate_candidate" || row.duplicateReason.trim(),
    );
  return {
    query,
    rows,
    mutation,
    cancelReason,
    toggle,
    changeReason,
    changeCancelReason,
    confirm,
    cancel,
    refresh,
    canConfirm,
    busy: mutation.isPending || query.isFetching,
    active: query.data && query.data.state !== "cancelled",
  };
}
