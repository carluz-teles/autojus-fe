"use client";

import { CheckCircle2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

import {
  useDeleteLetterhead,
  useSetDefaultLetterhead,
} from "../hooks/use-letterheads";
import { formatMarginsCm } from "../lib/apresentacao";
import type { LetterheadView } from "../types";
import { LetterheadPreview } from "./letterhead-preview";

/**
 * Card de um papel timbrado no grid de Configurações: preview A4 com a área
 * segura, nome + selo "Padrão", margens em cm e ações (renomear, definir padrão,
 * excluir). As mutações vivem nos hooks; o componente só faz binding.
 */
export function LetterheadCard({
  letterhead,
  onEdit,
}: {
  letterhead: LetterheadView;
  onEdit: (letterhead: LetterheadView) => void;
}) {
  const setDefault = useSetDefaultLetterhead();
  const remove = useDeleteLetterhead();
  const busy = setDefault.isPending || remove.isPending;

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-sm">
      <div className="border-border border-b p-3">
        <LetterheadPreview margins={letterhead.margins} decorated />
      </div>
      <div className="flex flex-1 flex-col px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium" title={letterhead.name}>
            {letterhead.name}
          </p>
          {letterhead.is_default ? (
            <Badge variant="success" className="shrink-0">
              <CheckCircle2 aria-hidden />
              Padrão
            </Badge>
          ) : null}
        </div>
        <p className="text-fg3 mt-1 font-mono text-[11.5px]">
          {formatMarginsCm(letterhead.margins)}
        </p>
      </div>
      <div className="border-border flex items-center gap-1 border-t p-1.5">
        <Button
          variant="ghost"
          size="xs"
          disabled={busy}
          onClick={() => onEdit(letterhead)}
        >
          Renomear
        </Button>
        {letterhead.is_default ? null : (
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={() => setDefault.mutate(letterhead.id)}
          >
            Definir padrão
          </Button>
        )}
        <div className="flex-1" />
        <Tooltip
          label="Excluir"
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={busy}
              aria-label={`Excluir ${letterhead.name}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Excluir o papel timbrado "${letterhead.name}"? Esta ação não pode ser desfeita.`,
                  )
                ) {
                  remove.mutate(letterhead.id);
                }
              }}
            />
          }
        >
          <Trash2 aria-hidden />
        </Tooltip>
      </div>
    </div>
  );
}
