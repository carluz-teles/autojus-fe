"use client";

import { AlertCircle, Clock3, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

import { useSyncAutos } from "../hooks/use-sync-autos";
import type { AutosSyncScope } from "../lib/autos-sync";

export function SyncAutosButton({
  description,
  children,
  ...scope
}: AutosSyncScope & { description?: ReactNode; children?: ReactNode }) {
  const {
    mutation,
    reason,
    refreshDocuments,
    pending,
    failed,
    feedback,
    requesting,
    refreshingDocuments,
  } = useSyncAutos(scope);
  return (
    <div className="flex max-w-full min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {description && (
          <div className="text-muted-foreground min-w-0 flex-1 basis-56 text-xs leading-relaxed">
            {description}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex shrink-0">
            <Tooltip
              label={
                reason ||
                (scope.courtRecordId
                  ? "Buscar novos documentos deste processo no tribunal."
                  : "Buscar autos dos processos já importados nos tribunais conectados.")
              }
            >
              <Button
                size="sm"
                variant="outline"
                disabled={!!reason || requesting || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={mutation.isPending ? "animate-spin" : ""}
                />
                {mutation.isPending
                  ? "Solicitando…"
                  : pending
                    ? "Busca pendente"
                    : failed ||
                        mutation.isError ||
                        (mutation.data?.failures.length ?? 0) > 0
                      ? "Tentar novamente"
                      : "Sincronizar autos"}
              </Button>
            </Tooltip>
          </span>
          {children}
        </div>
      </div>
      {feedback && (mutation.isSuccess || pending || failed) && (
        <Alert
          role={feedback.failed ? "alert" : "status"}
          variant={feedback.failed ? "destructive" : "default"}
        >
          {feedback.failed ? (
            <AlertCircle aria-hidden />
          ) : (
            <Clock3 aria-hidden />
          )}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 basis-64">
              <AlertTitle>{feedback.title}</AlertTitle>
              <AlertDescription>
                {feedback.description}
                {feedback.error ? <p>{feedback.error}</p> : null}
                {(mutation.data?.failures.length ?? 0) > 0 && (
                  <p>{mutation.data?.failures.join(". ")}</p>
                )}
              </AlertDescription>
            </div>
            {((mutation.data?.queued ?? 0) > 0 || pending || failed) &&
              scope.courtRecordId && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={refreshingDocuments}
                  onClick={() => void refreshDocuments()}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden />
                  {refreshingDocuments ? "Atualizando…" : "Atualizar lista"}
                </Button>
              )}
          </div>
        </Alert>
      )}
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Não foi possível solicitar a busca</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
