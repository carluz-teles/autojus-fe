import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Opções do seletor de itens-por-página (respeita o MaxLimit=100 do BE). */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

interface ListPaginationProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Total do contexto atual (filtrado por busca) — exibido como "N resultados". */
  totalCount?: number;
  className?: string;
}

/**
 * Rodapé de paginação abaixo da tabela: seletor de itens-por-página à esquerda,
 * "Anterior/Próxima" à direita. Tudo por cursor keyset — "Anterior" desabilita na
 * página 1, "Próxima" quando não há next_cursor.
 */
export function ListPagination({
  pageSize,
  onPageSizeChange,
  pageNumber,
  canPrev,
  canNext,
  onPrev,
  onNext,
  totalCount,
  className,
}: ListPaginationProps) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>Itens por página</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => v != null && onPageSizeChange(Number(v))}
        >
          <SelectTrigger
            size="sm"
            className="w-16"
            aria-label="Itens por página"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeof totalCount === "number" ? (
          <span className="tabular-nums">
            · {formatCount(totalCount)}{" "}
            {totalCount === 1 ? "resultado" : "resultados"}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm tabular-nums">
          Página {pageNumber}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Página anterior"
        >
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
