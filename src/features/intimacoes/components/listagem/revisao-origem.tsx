"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

import type { linhaIntimacao } from "../../lib/listagem";

export function RevisaoOrigem({
  revisao,
  origem,
  origemDescricao,
}: Pick<ReturnType<typeof linhaIntimacao>, "revisao" | "origem"> & {
  origemDescricao?: string;
}) {
  return (
    <>
      {revisao.label ? (
        revisao.pending ? (
          <Tooltip
            label={revisao.description}
            render={
              <Badge
                variant="warning"
                render={
                  <button
                    type="button"
                    aria-label={`Entender: ${revisao.label}`}
                  />
                }
              />
            }
          >
            {revisao.label}
            <Info data-icon="inline-end" aria-hidden />
          </Tooltip>
        ) : (
          <span className="text-muted-foreground text-xs">{revisao.label}</span>
        )
      ) : null}
      {origem ? (
        origemDescricao ? (
          <Tooltip
            label={origemDescricao}
            render={
              <button
                type="button"
                className="text-muted-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-xs outline-none focus-visible:ring-2"
              />
            }
          >
            Origem: {origem}
            <Info className="size-3" aria-hidden />
          </Tooltip>
        ) : (
          <span className="text-muted-foreground text-xs">
            Origem: {origem}
          </span>
        )
      ) : null}
    </>
  );
}
