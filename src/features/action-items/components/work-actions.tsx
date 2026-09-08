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

import { useWorkMutation } from "../hooks/use-workspace";
import type { ActionItemView } from "../types";
import { WORK_TYPES } from "./new-providencia";

export function WorkActions({
  item,
  compact = false,
  returnTo,
}: {
  item: ActionItemView;
  compact?: boolean;
  returnTo?: string;
}) {
  const mutation = useWorkMutation();
  const [confirm, setConfirm] = useState<
    "accept" | "dismiss" | "cancel" | "reopen" | null
  >(null);
  const [menu, setMenu] = useState(false);
  const terminal = ["DONE", "CANCELLED", "DISMISSED"].includes(item.status);
  const retorno = returnTo || `/providencias/${item.id}`;
  const pieceHref = item.draft_id
    ? `/pecas/${item.draft_id}?retorno=${encodeURIComponent(retorno)}`
    : `/pecas/nova?providencia=${item.id}${item.intimation_id ? `&intimacao=${item.intimation_id}` : ""}&retorno=${encodeURIComponent(retorno)}`;
  const busy = mutation.isPending;
  const ask = (action: NonNullable<typeof confirm>) => {
    setMenu(false);
    setConfirm(action);
  };
  const run = (action: string) => {
    if (!busy)
      mutation.mutate(
        { id: item.id, action },
        { onSuccess: () => setConfirm(null) },
      );
  };
  const generating = item.draft_state === "EXTRACTING";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.status === "SUGGESTED" ? (
        <Button size="sm" disabled={busy} onClick={() => ask("accept")}>
          Revisar e adicionar
        </Button>
      ) : item.intimation_id &&
        (item.draft_id ||
          (item.gera_peca && !terminal && item.tipo_status === "confiavel")) ? (
        <Button
          size="sm"
          variant={item.draft_id ? "outline" : "default"}
          nativeButton={false}
          render={<Link href={pieceHref} />}
        >
          <Sparkles data-icon="inline-start" />
          {item.draft_id
            ? generating
              ? "Acompanhar geração"
              : "Abrir peça"
            : "Gerar peça"}
        </Button>
      ) : !terminal && item.gera_peca && item.intimation_id ? (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/providencias/${item.id}`} />}
        >
          Revisar tipo
        </Button>
      ) : item.status === "TODO" ? (
        <Button size="sm" disabled={busy} onClick={() => run("start")}>
          {busy && (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          )}
          Começar trabalho
        </Button>
      ) : item.status === "WORKING" ? (
        <Button size="sm" disabled={busy} onClick={() => run("complete")}>
          Concluir providência
        </Button>
      ) : null}
      <Popover open={menu} onOpenChange={setMenu}>
        <PopoverTrigger
          render={<Button size="icon-sm" variant="ghost" />}
          aria-label={`Mais ações: ${item.title}`}
        >
          <Ellipsis />
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-56 flex-col gap-1 p-2">
          {compact && (
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href={`/providencias/${item.id}`} />}
            >
              Abrir providência
            </Button>
          )}
          {item.status === "SUGGESTED" && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => ask("dismiss")}
            >
              Dispensar sugestão
            </Button>
          )}
          {item.status === "WORKING" && item.gera_peca && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => run("complete")}
            >
              Concluir providência
            </Button>
          )}
          {!terminal && item.status !== "SUGGESTED" && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => ask("cancel")}
            >
              Cancelar providência
            </Button>
          )}
          {terminal && (
            <Button
              variant="ghost"
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
              : confirm === "dismiss"
                ? "Dispensar sugestão"
                : confirm === "cancel"
                  ? "Cancelar providência"
                  : "Reabrir providência"
          }
          description={
            confirm === "accept"
              ? "Confira o trabalho proposto antes de adicioná-lo à sua fila."
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
