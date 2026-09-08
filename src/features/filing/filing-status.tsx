"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/use-api";

import { filingPresentation } from "./presentation";
import { getFilingAttempt } from "./service";

/** Read-only status: refreshing never calls approval or sends another petition. */
export function FilingStatusNotice({
  draftId,
  enabled,
}: {
  draftId: string;
  enabled: boolean;
}) {
  const api = useApi();
  const { orgId, userId } = useAuth();
  const filing = useQuery({
    queryKey: ["filing", orgId, userId, draftId],
    queryFn: ({ signal }) => getFilingAttempt(api, draftId, signal),
    enabled: enabled && Boolean(orgId && userId),
    refetchInterval: (query) =>
      ["ENFILEIRADO", "PROTOCOLANDO"].includes(query.state.data?.status ?? "")
        ? 5_000
        : false,
  });
  if (!enabled || filing.isPending || (!filing.data && !filing.isError))
    return null;
  if (filing.isError)
    return (
      <Alert className="shrink-0 rounded-none border-x-0">
        <AlertTitle>Não foi possível consultar o protocolo.</AlertTitle>
        <AlertDescription>
          Atualize o acompanhamento antes de iniciar outro envio.
        </AlertDescription>
        <Button
          className="mt-2 w-fit"
          variant="outline"
          size="sm"
          disabled={filing.isFetching}
          onClick={() => void filing.refetch()}
        >
          Atualizar acompanhamento
        </Button>
      </Alert>
    );
  const attempt = filing.data!;
  const presentation = filingPresentation(attempt);
  const Icon = presentation.confirmed ? CheckCircle2 : Clock3;
  return (
    <Alert className="shrink-0 rounded-none border-x-0">
      <Icon />
      <AlertTitle>{presentation.label}</AlertTitle>
      <AlertDescription>
        {presentation.message}
        {attempt.filing_number ? (
          <span className="mt-1 block">
            {presentation.receiptLabel}: {attempt.filing_number}
          </span>
        ) : null}
        {attempt.failure_reason ? (
          <span className="mt-1 block">{attempt.failure_reason}</span>
        ) : null}
      </AlertDescription>
      <Button
        className="mt-2 w-fit"
        variant="outline"
        size="sm"
        disabled={filing.isFetching}
        onClick={() => void filing.refetch()}
      >
        Atualizar acompanhamento
      </Button>
    </Alert>
  );
}
