"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import {
  annotationKeys,
  assignmentWritable,
  getAnnotationAssignment,
  getAnnotationDraft,
  getAnnotationInput,
  getAnnotationSubmission,
} from "../../services/annotation-assignments";

export function useAnnotationDetail(id: string, allowed: boolean) {
  const api = useApi();
  const detail = useQuery({
    queryKey: annotationKeys.detail(id),
    queryFn: ({ signal }) => getAnnotationAssignment(api, id, signal),
    enabled: allowed,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.error ||
      (query.state.data && !assignmentWritable(query.state.data.assignment))
        ? false
        : 15000,
  });
  const writable = !!detail.data && assignmentWritable(detail.data.assignment);
  const input = useQuery({
    queryKey: annotationKeys.input(id),
    queryFn: ({ signal }) => getAnnotationInput(api, id, signal),
    enabled: allowed && writable && !detail.isError,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.error || !writable ? false : 30000,
  });
  const recovery = useQuery({
    queryKey: annotationKeys.draft(id),
    queryFn: ({ signal }) => getAnnotationDraft(api, id, signal),
    enabled: allowed && !!detail.data && !writable,
    retry: false,
  });
  const submissionId = detail.data?.submission?.id;
  const submission = useQuery({
    queryKey: [...annotationKeys.all, "submission", submissionId],
    queryFn: ({ signal }) =>
      getAnnotationSubmission(api, submissionId!, signal),
    enabled: allowed && !!submissionId,
    retry: false,
  });
  const denied = [detail.error, input.error].some(
    (error) =>
      error instanceof ApiError &&
      (error.isAuth || error.status === 403 || error.status === 404),
  );
  async function refresh() {
    const latest = await detail.refetch();
    if (latest.data && assignmentWritable(latest.data.assignment))
      await input.refetch();
    else await recovery.refetch();
  }
  return {
    detail,
    input,
    recovery,
    submission,
    denied,
    writable: writable && !input.isError && !detail.isError,
    refresh,
  };
}
