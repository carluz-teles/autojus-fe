"use client";

import { Ellipsis, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { TeorContent } from "@/components/teor-content";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";

import { useWorkMutation, type WorkAction } from "../hooks/use-workspace";
import { hasActionableFulfillment } from "../lib/fulfillment";
import { primaryWorkAction } from "../lib/work-action";
import type { ActionItemView } from "../types";
import { WORK_TYPES } from "./new-providencia";
import { ProvidenciaFulfillment } from "./providencia-fulfillment";

export function WorkActions({
  item,
  compact = false,
  returnTo,
  onReviewType,
}: {
  item: ActionItemView;
  compact?: boolean;
  returnTo?: string;
  onReviewType?: () => void;
}) {
  const mutation = useWorkMutation();
  const [confirm, setConfirm] = useState<
    "accept" | "accept_completed" | "dismiss" | "cancel" | "reopen" | null
  >(null);
  const [menu, setMenu] = useState(false);
  const terminal = ["DONE", "CANCELLED", "DISMISSED"].includes(item.status);
  const primaryAction = primaryWorkAction(item);
  const retorno = returnTo || `/providencias/${item.id}`;
  const pieceHref = item.draft_id
    ? `/pecas/${item.draft_id}?retorno=${encodeURIComponent(retorno)}`
    : `/pecas/nova?providencia=${item.id}${item.intimation_id ? `&intimacao=${item.intimation_id}` : ""}&retorno=${encodeURIComponent(retorno)}`;
  const busy = mutation.isPending;
  const decisionBlocked =
    !!item.origin_review_required || item.tipo_status !== "confiavel";
  const canCreateCompleted =
    item.status === "SUGGESTED" &&
    !decisionBlocked &&
    hasActionableFulfillment(item.fulfillment);
  const ask = (action: NonNullable<typeof confirm>) => {
    setMenu(false);
    setConfirm(action);
  };
  const run = (action: WorkAction) => {
    if (!busy)
      mutation.mutate(
        { id: item.id, action },
        { onSuccess: () => setConfirm(null) },
      );
  };
  const generating = item.draft_state === "EXTRACTING";
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {primaryAction === "review-origin" ? (
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              href={`${detalheNaFila(item.intimation_id, returnTo || `/providencias/${item.id}`)}#prazo-decisao`}
            />
          }
          nativeButton={false}
        >
          Confirmar tipo e prazo
        </Button>
      ) : primaryAction === "review-suggestion" ? (
        <>
          <Button size="sm" disabled={busy} onClick={() => ask("accept")}>
            Revisar e adicionar
          </Button>
          {canCreateCompleted ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => ask("accept_completed")}
            >
              Criar já concluída
            </Button>
          ) : null}
        </>
      ) : primaryAction === "open-piece" ||
        primaryAction === "generate-piece" ? (
        <Button
          size="sm"
          variant={primaryAction === "open-piece" ? "outline" : "default"}
          nativeButton={false}
          render={<Link href={pieceHref} />}
        >
          <Sparkles data-icon="inline-start" />
          {primaryAction === "open-piece"
            ? generating
              ? "Acompanhar geração"
              : "Abrir peça"
            : "Gerar peça"}
        </Button>
      ) : primaryAction === "review-type" ? (
        onReviewType ? (
          <Button size="sm" variant="outline" onClick={onReviewType}>
            Revisar tipo
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/providencias/${item.id}`} />}
          >
            Revisar tipo
          </Button>
        )
      ) : primaryAction === "start-work" ? (
        <Button size="sm" disabled={busy} onClick={() => run("start")}>
          {busy && (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          )}
          Começar trabalho
        </Button>
      ) : primaryAction === "complete-work" ? (
        <Button size="sm" disabled={busy} onClick={() => run("complete")}>
          Concluir providência
        </Button>
      ) : null}
      <Popover open={menu} onOpenChange={setMenu}>
        <Tooltip
          label={`Mais ações: ${item.title}`}
          render={
            <PopoverTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Mais ações: ${item.title}`}
                />
              }
            />
          }
        >
          <Ellipsis aria-hidden />
        </Tooltip>
        <PopoverContent align="end" className="flex w-60 flex-col gap-1 p-2">
          {compact && (
            <Button
              variant="ghost"
              className="justify-start"
              nativeButton={false}
              render={<Link href={`/providencias/${item.id}`} />}
            >
              Abrir providência
            </Button>
          )}
          {item.status === "SUGGESTED" && (
            <>
              <Button
                variant="ghost"
                className="justify-start"
                disabled={busy}
                onClick={() => ask("dismiss")}
              >
                Descartar sugestão
              </Button>
              {canCreateCompleted ? (
                <Button
                  variant="ghost"
                  className="justify-start"
                  disabled={busy}
                  onClick={() => ask("accept_completed")}
                >
                  Criar já concluída
                </Button>
              ) : null}
            </>
          )}
          {item.status === "WORKING" && item.gera_peca && (
            <Button
              variant="ghost"
              className="justify-start"
              disabled={busy}
              onClick={() => run("complete")}
            >
              Concluir providência
            </Button>
          )}
          {!terminal && item.status !== "SUGGESTED" && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive justify-start"
              disabled={busy}
              onClick={() => ask("cancel")}
            >
              Cancelar providência
            </Button>
          )}
          {terminal && (
            <Button
              variant="ghost"
              className="justify-start"
              disabled={busy}
              onClick={() => ask("reopen")}
            >
              {item.status === "DISMISSED"
                ? "Restaurar sugestão"
                : "Reabrir providência"}
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {mutation.isError && (
        <p role="alert" className="text-destructive w-full text-xs">
          Não foi possível concluir a ação. Tente novamente.
        </p>
      )}
      <Sheet
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <SheetContent
          title={
            confirm === "accept"
              ? "Revisar providência"
              : confirm === "accept_completed"
                ? "Criar já concluída"
                : confirm === "dismiss"
                  ? "Descartar sugestão"
                  : confirm === "cancel"
                    ? "Cancelar providência"
                    : "Reabrir providência"
          }
          description={
            confirm === "accept"
              ? "Confira o trabalho proposto antes de adicioná-lo à sua fila."
              : confirm === "accept_completed"
                ? "A sugestão será registrada como concluída por decisão humana, sem criar peça ou protocolo."
                : "A alteração ficará registrada no histórico."
          }
          footer={
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Voltar
              </Button>
              <Button disabled={busy} onClick={() => confirm && run(confirm)}>
                {busy
                  ? "Salvando…"
                  : confirm === "accept"
                    ? "Confirmar e adicionar"
                    : "Confirmar"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="font-medium">{item.title}</p>
            {item.description && <TeorContent content={item.description} />}
            {confirm === "accept" || confirm === "accept_completed" ? (
              <ProvidenciaFulfillment fulfillment={item.fulfillment} />
            ) : null}
            {confirm === "accept" && (
              <>
                <p className="text-sm">
                  Tipo proposto: <strong>{WORK_TYPES[item.tipo]}</strong>
                </p>
                <p className="text-muted-foreground text-sm">
                  Ao adicionar, você confirma o tipo apresentado. Para corrigir
                  o tipo ou a descrição, abra o detalhe da providência.
                </p>
                <Link
                  className="text-primary underline"
                  href={`/providencias/${item.id}`}
                >
                  Revisar detalhes e editar
                </Link>
              </>
            )}
            {confirm === "accept_completed" && (
              <>
                <p className="text-sm">
                  Tipo proposto: <strong>{WORK_TYPES[item.tipo]}</strong>
                </p>
                <p className="text-muted-foreground text-sm">
                  Esta ação incorpora a mesma sugestão como concluída. Ela não
                  simula elaboração, protocolo ou cumprimento automático.
                </p>
                <Link
                  className="text-primary underline"
                  href={`/providencias/${item.id}`}
                >
                  Revisar detalhes e editar
                </Link>
              </>
            )}
            {confirm === "cancel" && (
              <p className="text-sm">
                Você poderá reabrir esta providência. A peça e o prazo judicial
                vinculados serão preservados.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
