"use client";

// Linha da fila "A triar" — o coração da Triagem. Duas linhas com HIERARQUIA: título serif
// (deep-link) como foco, prazo à direita; linha 2 secundária (CNJ · tribunal · ato). Exceções
// ganham accent + tint âmbar (destaque visual). Ações uniformes — mesmo tamanho, sempre visíveis.

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
  // Ação primária pela DISPOSIÇÃO (segmento disjunto): ciência dá ciência; trabalho (confiável)
  // confirma; exceção/sem-prazo/analisando pedem REVISÃO (o motor está incerto ou não classificou).
  // O ato fino é escolhido no gerar-peça (lazy), nunca aqui.
  const acionavelConfiavel = row.segment === "trabalhar";
  const primary =
    row.segment === "ciencia"
      ? {
          label: "Dar ciência",
          short: "Ciência",
          kind: "ciencia" as RowAction,
          icon: CheckCheck,
        }
      : acionavelConfiavel
        ? {
            label: "Confirmar prazo",
            short: "Confirmar",
            kind: "confirmar" as RowAction,
            icon: Check,
          }
        : {
            label: "Revisar tipo e prazo",
            short: "Revisar",
            kind: "definir" as RowAction,
            icon: CalendarDays,
          };
  const Primary = primary.icon;
  // Gera peça é oferecido nos itens ACIONÁVEIS (trabalho e exceção).
  const acionavel = row.segment === "trabalhar" || row.segment === "excecao";
  const isExc = row.isExcecao;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 pr-3 pl-4 transition-colors",
        compact ? "py-2" : "py-3",
        selected
          ? "bg-selected"
          : isExc
            ? "bg-gold/[0.045] hover:bg-gold/[0.08]"
            : "hover:bg-muted/40",
      )}
    >
      {/* accent âmbar das exceções — o realce visual do segmento */}
      {isExc ? (
        <span
          className="bg-gold absolute inset-y-0 left-0 w-[3px]"
          aria-hidden
        />
      ) : null}

      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={`Selecionar ${row.title}`}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Linha 1 (foco): categoria · exceção · TÍTULO · prazo */}
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={row.categoria} label={row.categoriaLabel} />
          {isExc ? <ExcecaoDot motivo={row.excecaoMotivo} /> : null}
          <Link
            href={href}
            title={row.preview || row.title}
            className="font-display text-foreground hover:text-primary min-w-0 truncate text-left text-[14px] leading-snug font-medium underline-offset-4 outline-none hover:underline"
          >
            {row.title}
          </Link>
          <span className="ml-auto shrink-0">
            <PrazoBadge prazo={row.prazo} />
          </span>
        </div>

        {/* Linha 2 (secundária): CNJ · tribunal · ato */}
        <div className="text-fg3 flex min-w-0 items-center gap-1.5 text-[11.5px]">
          <span className="min-w-0 truncate font-mono">{row.meta}</span>
          <span aria-hidden className="shrink-0">
            ·
          </span>
          <span className="text-foreground/70 shrink-0 truncate">
            {row.ato}
          </span>
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

      {/* Ações — UNIFORMES (mesmo tamanho), sempre visíveis */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          className="h-8 min-w-[104px] justify-center"
          onClick={() => onAction(primary.kind, row)}
        >
          <Primary data-icon="inline-start" />
          {primary.short}
        </Button>

        {acionavel && row.geraPeca ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 min-w-[104px] justify-center"
            onClick={() => onAction("peca", row)}
          >
            <PenLine data-icon="inline-start" />
            Peça
          </Button>
        ) : null}

        <MenuDropdown
          trigger={
            <span
              className="hover:bg-muted text-muted-foreground grid size-8 shrink-0 place-content-center rounded-md transition-colors"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="size-4" />
            </span>
          }
        >
          {(close) => (
            <>
              {!acionavel && row.rec?.gera_peca ? (
                <MenuItem
                  onClick={() => {
                    onAction("peca", row);
                    close();
                  }}
                >
                  <PenLine className="size-4" aria-hidden />
                  Gerar peça
                </MenuItem>
              ) : null}
              {row.segment !== "ciencia" && row.segment !== "analisando" ? (
                <MenuItem
                  onClick={() => {
                    onAction("ciencia", row);
                    close();
                  }}
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Dar ciência
                </MenuItem>
              ) : null}
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
        "hover:bg-muted/40 flex items-center gap-3 pr-3 pl-4 transition-colors",
        compact ? "py-2" : "py-3",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={row.categoria} label={row.categoriaLabel} />
          <Link
            href={href}
            title={row.title}
            className="font-display text-foreground hover:text-primary min-w-0 truncate text-[14px] leading-snug font-medium underline-offset-4 outline-none hover:underline"
          >
            {row.title}
          </Link>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <PrazoBadge prazo={row.prazo} />
            <RespAvatar nome={row.responsavelNome} />
          </span>
        </div>
        <div className="text-fg3 flex min-w-0 items-center gap-1.5 text-[11.5px]">
          <span className="min-w-0 truncate font-mono">{row.meta}</span>
          <span aria-hidden className="shrink-0">
            ·
          </span>
          <span className="text-foreground/70 shrink-0 truncate">
            {row.ato}
          </span>
          <span
            className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
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
