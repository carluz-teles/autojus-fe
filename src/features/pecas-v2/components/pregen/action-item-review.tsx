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
      {/* A UI comunica pela AÇÃO e pela FONTE do dado, nunca pela tecnologia
          ("IA"/modelo) — diretiva app-wide, igual a ORIGEM_LABEL.ia =
          "Inferido" e REVIEW_ORIGIN_LABEL.ia = "Sugerido pela análise". */}
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        Tipo e perfil de peça sugeridos a partir do texto da publicação. Confira
        a sugestão antes de continuar. Esta confirmação não valida o conteúdo
        jurídico nem altera o prazo.
      </p>
      {/* Rótulo sempre traduzido: o fallback era a CHAVE crua do BE
          ("cumprimento_sentenca"). Mesmo padrão de rotuloObrigacao. */}
      <div className="surface-inset mb-4 space-y-2 p-4 text-sm">
        <p>Trabalho: {WORK_TYPES[item.tipo] ?? "Trabalho a identificar"}</p>
        <p>
          Peça:{" "}
          {PIECE_PROFILES[item.piece_profile_key ?? ""] ?? "Peça a identificar"}
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
