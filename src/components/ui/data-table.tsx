import { type RowActionItem, RowActions } from "@/components/ui/row-actions";
import { DOT_CLASS, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

// Casca de tabela do DS (headless-ish): a feature descreve colunas + linhas e
// como renderizar cada célula; o componente desenha o <table> nativo (mesmo
// padrão de /processos), o ponto de status à esquerda, o cabeçalho e a coluna
// final "AÇÃO" com kebab. Sem estado interno — busca/paginação vivem no hook.

export interface DataTableColumn<T> {
  /** Chave estável da coluna (usada no key do <th>/<td>). */
  key: string;
  header: React.ReactNode;
  /** Renderiza a célula a partir da linha. */
  cell: (row: T) => React.ReactNode;
  /** Alinhamento do conteúdo. */
  align?: "left" | "right" | "center";
  /** Largura da coluna (CSS). Com qualquer largura definida a tabela vira fixed. */
  width?: string | number;
  className?: string;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Chave estável de cada linha (React key). */
  rowKey: (row: T) => string;
  /** Ponto de status colorido à esquerda da linha (opcional). */
  statusTone?: (row: T) => StatusTone;
  /** Ações do kebab na coluna final "AÇÃO". Omite a coluna quando ausente. */
  rowActions?: (row: T) => RowActionItem[];
  /** Link/handler ao clicar na linha (a 1ª célula vira o alvo acessível). */
  onRowClick?: (row: T) => void;
  /** Estados de borda — a casca só decide o colspan/centralização. */
  isLoading?: boolean;
  loadingLabel?: React.ReactNode;
  error?: React.ReactNode;
  empty?: React.ReactNode;
  /** Rodapé "Mostrando X a Y de Z" — a feature passa os números do cursor. */
  rangeFrom?: number;
  rangeTo?: number;
  total?: number;
  /** Slot de paginação (normalmente <ListPagination/>). */
  pagination?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  statusTone,
  rowActions,
  onRowClick,
  isLoading = false,
  loadingLabel = "Carregando…",
  error,
  empty,
  rangeFrom,
  rangeTo,
  total,
  pagination,
  className,
}: DataTableProps<T>) {
  const hasStatus = Boolean(statusTone);
  const hasActions = Boolean(rowActions);
  // total de colunas visíveis (status + dados + ação) pro colspan dos estados.
  const span = columns.length + (hasStatus ? 1 : 0) + (hasActions ? 1 : 0);
  // Com qualquer largura definida a tabela passa a layout fixo — permite que
  // colunas com truncate respeitem o limite em vez de estourar o container.
  const fixedLayout = columns.some((c) => c.width != null);

  const showRange =
    typeof rangeFrom === "number" &&
    typeof rangeTo === "number" &&
    typeof total === "number";

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="bg-card overflow-x-auto rounded-xl border shadow-sm"
        aria-busy={isLoading}
      >
        <table className={cn("w-full text-sm", fixedLayout && "table-fixed")}>
          <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <tr>
              {hasStatus ? <th className="w-6 px-2 py-3" aria-hidden /> : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width != null ? { width: col.width } : undefined}
                  className={cn(
                    "px-5 py-3 font-medium",
                    col.align && ALIGN[col.align],
                  )}
                >
                  {col.header}
                </th>
              ))}
              {hasActions ? (
                <th className="w-16 px-5 py-3 text-right font-medium">Ação</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <StateRow span={span}>{loadingLabel}</StateRow>
            ) : error ? (
              <StateRow span={span} tone="danger">
                {error}
              </StateRow>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={span} className="p-0">
                  {empty ?? (
                    <p className="text-muted-foreground px-5 py-10 text-center">
                      Nenhum resultado.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const tone = statusTone?.(row);
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group hover:bg-muted/40 focus-within:bg-muted/40 transition-colors",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {hasStatus ? (
                      <td className="py-4 pl-4">
                        <span
                          className={cn(
                            "block size-2 rounded-full",
                            tone ? DOT_CLASS[tone] : "bg-transparent",
                          )}
                          aria-hidden
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-5 py-4",
                          col.align && ALIGN[col.align],
                          col.className,
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                    {hasActions ? (
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end">
                          <RowActions items={rowActions?.(row)} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showRange || pagination ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {showRange ? (
            <p className="text-muted-foreground text-sm tabular-nums">
              Mostrando {rangeFrom} a {rangeTo} de {total}
            </p>
          ) : (
            <span />
          )}
          {pagination}
        </div>
      ) : null}
    </div>
  );
}

function StateRow({
  span,
  tone,
  children,
}: {
  span: number;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className={cn(
          "px-5 py-10 text-center",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {children}
      </td>
    </tr>
  );
}
