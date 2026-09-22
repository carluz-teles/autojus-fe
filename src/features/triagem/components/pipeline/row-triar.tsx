"use client";

// Linha densa da fila "A triar" — o coração da Triagem-pipeline. Extraída do mockup
// dev/triagem-v2 e ligada ao contrato real (PipelineRow) + mutações reais via os
// callbacks (a view injeta). SEMPRE mostra as ações compactas (Confirmar/Ciência/
// Definir prazo · Peça · ⋮). O título é um deep-link ao detalhe da intimação.

import {
  CalendarDays,
  Check,
  CheckCheck,
  Clock,
  MoreHorizontal,
  PenLine,
  X,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import type { PipelineRow } from "../../lib/pipeline";
import {
  CategoriaChip,
  ExcecaoDot,
  iniciais,
  PrazoBadge,
  RespAvatar,
} from "./atoms";
import { MenuDropdown, MenuItem } from "./menu";

/** Ação primária de uma linha (a barra inline age nela). */
export type RowAction =
  "confirmar" | "peca" | "ciencia" | "definir" | "adiar" | "descartar";

export type Density = "confortavel" | "compacto";

/** Membro atribuível — o subconjunto do diretório do escritório que o menu usa. */
export interface AssignableMember {
  id: string;
  nome: string;
}

export function RowTriar({
  row,
  selected,
  density,
  members,
  href,
  adiarDisponivel = false,
  onToggleSelect,
  onAction,
  onAssign,
}: {
  row: PipelineRow;
  selected: boolean;
  density: Density;
  members: AssignableMember[];
  /** URL do detalhe da intimação. */
  href: string;
  adiarDisponivel?: boolean;
  onToggleSelect: () => void;
  onAction: (kind: RowAction, row: PipelineRow) => void;
  onAssign: (row: PipelineRow, memberId: string | null) => void;
}) {
  const compact = density === "compacto";
  const primary =
    row.segment === "ciencia"
      ? {
          label: "Dar ciência",
          short: "Ciência",
          kind: "ciencia" as RowAction,
          icon: CheckCheck,
        }
      : row.segment === "sem-prazo"
        ? {
            label: "Revisar tipo e prazo",
            short: "Revisar",
            kind: "definir" as RowAction,
            icon: CalendarDays,
          }
        : {
            label: "Confirmar prazo",
            short: "Confirmar",
            kind: "confirmar" as RowAction,
            icon: Check,
          };
  const Primary = primary.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 sm:px-4",
        compact ? "py-1.5" : "py-2.5",
        selected ? "bg-primary/[0.05]" : "hover:bg-muted/30",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={`Selecionar ${row.title}`}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Linha 1: categoria · exceção · título · prazo */}
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={row.categoria} label={row.categoriaLabel} />
          {row.isExcecao && <ExcecaoDot motivo={row.excecaoMotivo} />}
          <Link
            href={href}
            title={row.preview || row.title}
            className="font-display text-foreground hover:text-primary min-w-0 truncate text-left text-[13.5px] leading-tight font-medium underline-offset-4 outline-none hover:underline"
          >
            {row.title}
          </Link>
          <span className="ml-auto shrink-0">
            <PrazoBadge prazo={row.prazo} />
          </span>
        </div>

        {/* Linha 2: meta mono · ato · gera peça */}
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-mono">{row.meta}</span>
          <span className="text-fg3 shrink-0">·</span>
          <span className="text-foreground/70 shrink-0 truncate">
            {row.ato}
          </span>
          {row.geraPeca && row.segment === "trabalhar" && (
            <Badge variant="secondary" className="ml-0.5 hidden sm:inline-flex">
              gera peça
            </Badge>
          )}
        </div>
      </div>

      {/* Responsável (avatar clicável) */}
      <MenuDropdown
        align="end"
        trigger={
          <span
            className="hover:bg-muted shrink-0 rounded-full p-0.5 transition-colors"
            aria-label="Responsável"
          >
            <RespAvatar nome={row.responsavelNome} />
          </span>
        }
      >
        {(close) => (
          <>
            <p className="section-label px-2.5 py-1">Responsável</p>
            {members.map((m) => (
              <MenuItem
                key={m.id}
                onClick={() => {
                  onAssign(row, m.id);
                  close();
                }}
              >
                <span className="bg-primary/12 text-primary grid size-5 place-content-center rounded-full text-[0.6rem] font-semibold">
                  {iniciais(m.nome)}
                </span>
                {m.nome}
              </MenuItem>
            ))}
            <MenuItem
              onClick={() => {
                onAssign(row, null);
                close();
              }}
            >
              <span className="border-line grid size-5 place-content-center rounded-full border border-dashed">
                <X className="size-3" aria-hidden />
              </span>
              Sem responsável
            </MenuItem>
          </>
        )}
      </MenuDropdown>

      {/* Ações inline — SEMPRE visíveis, compactas (icon-only no Compacto) */}
      <div className="flex shrink-0 items-center gap-1">
        {compact ? (
          <Button
            size="icon-sm"
            className="size-7"
            onClick={() => onAction(primary.kind, row)}
            aria-label={primary.label}
            title={primary.label}
          >
            <Primary />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 px-2.5"
            onClick={() => onAction(primary.kind, row)}
          >
            <Primary data-icon="inline-start" />
            {primary.short}
          </Button>
        )}

        {row.segment === "trabalhar" &&
          row.geraPeca &&
          (compact ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="size-7"
              onClick={() => onAction("peca", row)}
              aria-label="Gerar peça"
              title="Gerar peça"
            >
              <PenLine />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5"
              onClick={() => onAction("peca", row)}
            >
              Peça
            </Button>
          ))}

        <MenuDropdown
          trigger={
            <span
              className="hover:bg-muted text-muted-foreground grid size-7 shrink-0 place-content-center rounded-md transition-colors"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="size-4" />
            </span>
          }
        >
          {(close) => (
            <>
              {row.segment !== "trabalhar" && row.rec?.gera_peca && (
                <MenuItem
                  onClick={() => {
                    onAction("peca", row);
                    close();
                  }}
                >
                  <PenLine className="size-4" aria-hidden />
                  Gerar peça
                </MenuItem>
              )}
              {row.segment !== "ciencia" && (
                <MenuItem
                  onClick={() => {
                    onAction("ciencia", row);
                    close();
                  }}
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Dar ciência
                </MenuItem>
              )}
              <MenuItem
                disabled={!adiarDisponivel}
                title={adiarDisponivel ? undefined : "em breve"}
                onClick={() => {
                  if (!adiarDisponivel) return;
                  onAction("adiar", row);
                  close();
                }}
              >
                <Clock className="size-4" aria-hidden />
                Adiar
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onAction("descartar", row);
                  close();
                }}
                danger
              >
                <X className="size-4" aria-hidden />
                Descartar
              </MenuItem>
            </>
          )}
        </MenuDropdown>
      </div>
    </div>
  );
}

/** Linha read-only compacta — Em andamento / Concluído. Estado do read model
 *  (estado.ts), prazo e responsável; "Abrir intimação" via título. */
export function RowReadonly({
  row,
  density,
  href,
}: {
  row: PipelineRow;
  density: Density;
  href: string;
}) {
  const compact = density === "compacto";
  return (
    <div
      className={cn(
        "hover:bg-muted/30 flex items-center gap-2.5 px-3 sm:px-4",
        compact ? "py-1.5" : "py-2.5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={row.categoria} label={row.categoriaLabel} />
          <Link
            href={href}
            title={row.title}
            className="font-display text-foreground hover:text-primary min-w-0 truncate text-[13.5px] leading-tight font-medium underline-offset-4 outline-none hover:underline"
          >
            {row.title}
          </Link>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <PrazoBadge prazo={row.prazo} />
            <RespAvatar nome={row.responsavelNome} />
          </span>
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-mono">{row.meta}</span>
          <span className="text-fg3 shrink-0">·</span>
          <span className="shrink-0">{row.ato}</span>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ color: row.estado.cor, backgroundColor: row.estado.fundo }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: row.estado.cor }}
              aria-hidden
            />
            {row.estado.label}
          </span>
        </div>
      </div>
    </div>
  );
}
