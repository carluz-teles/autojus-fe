"use client";

import { Button } from "@/components/ui/button";
import {
  PIECE_PROFILES,
  WORK_TYPES,
} from "@/features/action-items/lib/piece-labels";
import type { ActionItemView } from "@/features/action-items/types";

export function ActionItemReview({
  item,
  pending,
  error,
  onConfirm,
  onCancel,
  titleId,
}: {
  item: ActionItemView;
  pending: boolean;
  error: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  titleId?: string;
}) {
  return (
    <>
      <h2 id={titleId} className="font-display mb-2 text-[22px] font-medium">
        Confirme o tipo de trabalho
      </h2>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        A IA sugeriu este tipo e perfil de peça. Confira a sugestão antes de
        continuar. Esta confirmação não valida o conteúdo jurídico nem altera o
        prazo.
      </p>
      <div className="surface-inset mb-4 space-y-2 p-4 text-sm">
        <p>Trabalho: {WORK_TYPES[item.tipo] ?? item.tipo}</p>
        <p>
          Peça:{" "}
          {PIECE_PROFILES[item.piece_profile_key ?? ""] ??
            item.piece_profile_key}
        </p>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm">
          Não foi possível confirmar o tipo. Confira a conexão e tente
          novamente.
        </p>
      )}
      {pending && <p role="status">Confirmando o tipo…</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          Confirmar tipo e continuar
        </Button>
      </div>
    </>
  );
}
