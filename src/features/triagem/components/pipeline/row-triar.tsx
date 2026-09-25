"use client";

// Linha da Mesa de Trabalho ("A triar") — DUAS COLUNAS (direção final do usuário;
// skills frontend-design + ui-ux-pro-max §5 visual-hierarchy / §6 weight-hierarchy):
//   • COLUNA 1 (flexível): identidade + metadados; abaixo do divisor, CTAs
//     alinhados à esquerda. A linha atual do preview tem destaque próprio.
//   • COLUNA 2 (largura estável, centralizada verticalmente): RESPONSÁVEL + PRAZO,
//     lado a lado. O responsável REUSA o componente canônico
//     ResponsavelMenu (o mesmo do detalhe/PainelPrazo) — nada de visual inventado.
// Exceções mantêm accent + tint âmbar. Tokens preservados (font-display, --gold,
// --destructive, border-line, bg-card/selected/muted).

import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  MoreHorizontal,
  PenLine,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLinhaPreview } from "@/features/intimacoes/hooks/use-painel-detalhe";
import {
  onClickAbrirLinha,
  onClickAbrirPainel,
} from "@/features/intimacoes/lib/painel-click";
import { Responsavel } from "@/features/organization/components/responsavel";
import { ResponsavelMenu } from "@/features/organization/components/responsavel-menu";
import { cn } from "@/lib/utils";

import type { PipelineRow } from "../../lib/pipeline";
import { CategoriaChip, ExcecaoDot, PrazoDestaque } from "./atoms";
import { MenuDropdown, MenuItem } from "./menu";

/** Ação primária de uma linha (a barra inline age nela). */
export type RowAction = "abrir" | "peca" | "ciencia" | "definir" | "descartar";

export type Density = "confortavel" | "compacto";

/** Membro atribuível — o subconjunto do diretório do escritório que o menu usa. */
export interface AssignableMember {
  id: string;
  nome: string;
}

export function RowTriar({
  row,
  selected,
  previewAtivo = false,
  density,
  members,
  href,
  onToggleSelect,
  onAction,
  onAssign,
  onAbrir,
}: {
  row: PipelineRow;
  selected: boolean;
  previewAtivo?: boolean;
  density: Density;
  members: AssignableMember[];
  /** URL do detalhe da intimação (deep-link real; nova aba/leitor de tela). */
  href: string;
  onToggleSelect: () => void;
  onAction: (kind: RowAction, row: PipelineRow) => void;
  onAssign: (row: PipelineRow, memberId: string | null) => void;
  /** Abre no painel contextual in-place (clique simples, sem modificador). */
  onAbrir?: () => void;
}) {
  const previewRef = useLinhaPreview(previewAtivo);
  const compact = density === "compacto";
  // Prazo confiável leva ao trabalho, sem etapa intermediária de confirmação.
  // Sem alvo de peça disponível, abrir a intimação mantém o contexto acessível.
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
            label: row.geraPeca ? "Gerar peça" : "Abrir intimação",
            short: row.geraPeca ? "Gerar peça" : "Abrir intimação",
            kind: (row.geraPeca ? "peca" : "abrir") as RowAction,
            icon: row.geraPeca ? PenLine : ArrowRight,
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

  // Adapta os membros da linha ({id, nome}) ao contrato do ResponsavelMenu
  // canônico ({id, name, email}) — reuso do MESMO controle das outras telas
  // (detalhe/PainelPrazo), sem visual de responsável inventado.
  const membros = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.nome, email: "" })),
    [members],
  );

  return (
    <div
      ref={previewRef}
      aria-current={previewAtivo ? "true" : undefined}
      data-preview-active={previewAtivo || undefined}
      className={cn(
        "@container relative cursor-pointer pr-3 pl-4 transition-colors",
        compact ? "py-3" : "py-4",
        previewAtivo
          ? "bg-primary/8 ring-primary/50 ring-2 ring-inset"
          : selected
            ? "bg-selected"
            : isExc
              ? "bg-gold/[0.045] hover:bg-gold/[0.08]"
              : "hover:bg-muted/40",
      )}
      onClick={(e) => onClickAbrirLinha(e, onAbrir)}
    >
      {/* accent âmbar das exceções — o realce visual do segmento */}
      {isExc ? (
        <span
          className="bg-gold absolute inset-y-0 left-0 w-[3px]"
          aria-hidden
        />
      ) : null}

      {/* Layout container-aware: COLUNA ESQUERDA (informações em cima, hairline,
          ações embaixo à esquerda) + COLUNA DIREITA (responsável e prazo lado a
          lado, grupo centralizado verticalmente). Contêiner estreito (≤640px —
          o painel consome largura, então é query de CONTÊINER, não de viewport):
          a coluna direita desce abaixo, mantendo os dois lado a lado. */}
      <div className="flex items-stretch gap-3 @max-[640px]:flex-col @max-[640px]:gap-2.5">
        {/* grupo seleção + COLUNA ESQUERDA (flexível) */}
        <div className="flex min-w-0 flex-1 items-stretch gap-3 @max-[640px]:flex-none">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Selecionar ${row.title}`}
            className="mt-0.5 shrink-0 self-start"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {/* INFORMAÇÕES: identidade + meta */}
            <div
              className={cn(
                "flex min-w-0 flex-col",
                compact ? "gap-1" : "gap-1.5",
              )}
            >
              {/* linha 1: categoria · exceção · TÍTULO (abre o painel).
                  flex-wrap: a categoria pode subir acima do título se faltar espaço. */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <CategoriaChip
                  categoria={row.categoria}
                  label={row.categoriaLabel}
                />
                {isExc ? <ExcecaoDot motivo={row.excecaoMotivo} /> : null}
                {previewAtivo ? (
                  <span className="text-primary text-[11px] font-medium">
                    Em prévia
                  </span>
                ) : null}
                <Link
                  href={href}
                  title={row.preview || row.title}
                  onClick={(e) => onClickAbrirPainel(e, onAbrir)}
                  className="font-display text-foreground hover:text-primary min-w-0 flex-1 basis-40 truncate text-left text-[14.5px] leading-snug font-medium underline-offset-4 outline-none hover:underline"
                >
                  {row.title}
                </Link>
              </div>

              {/* linha 2: meta (CNJ · tribunal · ato) */}
              <div className="text-fg3 flex min-w-0 flex-wrap items-center gap-1.5 text-[11.5px]">
                <span className="min-w-0 truncate font-mono">{row.meta}</span>
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                <span className="text-foreground/70 min-w-0 truncate">
                  {row.atoPublicacao}
                </span>
              </div>
            </div>

            {/* SEÇÃO DE AÇÕES — abaixo das informações, separada por um hairline
                CONFINADO à coluna esquerda; botões alinhados à ESQUERDA. */}
            <div
              className={cn(
                "border-line/60 flex flex-wrap items-center gap-1.5 border-t",
                compact ? "mt-3 pt-3" : "mt-4 pt-4",
              )}
            >
              <Button
                size="sm"
                className={cn(
                  "min-w-[108px] justify-center",
                  compact ? "h-7" : "h-8",
                )}
                onClick={() => onAction(primary.kind, row)}
              >
                <Primary data-icon="inline-start" />
                {primary.short}
              </Button>

              {acionavel && row.geraPeca && primary.kind !== "peca" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "min-w-[88px] justify-center",
                    compact ? "h-7" : "h-8",
                  )}
                  onClick={() => onAction("peca", row)}
                >
                  <PenLine data-icon="inline-start" />
                  Peça
                </Button>
              ) : null}

              <MenuDropdown
                trigger={
                  <span
                    className={cn(
                      "hover:bg-muted text-muted-foreground grid shrink-0 place-content-center rounded-md transition-colors",
                      compact ? "size-7" : "size-8",
                    )}
                    aria-label="Mais ações"
                  >
                    <MoreHorizontal className="size-4" />
                  </span>
                }
              >
                {(close) => (
                  <>
                    {row.rec && (!row.geraPeca || !acionavel) ? (
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
                    {row.segment !== "ciencia" &&
                    row.segment !== "analisando" ? (
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
        </div>

        {/* ── COLUNA DIREITA: responsável e prazo LADO A LADO, grupo centralizado
            verticalmente na linha. Estreito (≤640px): desce abaixo, mas os dois
            permanecem lado a lado; o nome usa a truncagem do controle canônico. */}
        <div className="flex w-[340px] shrink-0 items-center justify-center gap-3 @max-[640px]:w-full @max-[640px]:pl-7">
          <div className="flex max-w-[190px] min-w-0 flex-1 justify-center">
            <ResponsavelMenu
              value={row.responsavelId}
              nome={row.responsavelNome}
              membros={membros}
              emVoo={false}
              onAssign={(memberId) => onAssign(row, memberId)}
            />
          </div>
          <PrazoDestaque prazo={row.prazo} dense={compact} />
        </div>
      </div>
    </div>
  );
}

/** Linha read-only compacta — Em andamento / Concluído. Estado do read model
 *  (estado.ts), prazo e responsável; "Abrir intimação" via título. */
export function RowReadonly({
  row,
  previewAtivo = false,
  density,
  href,
  onAbrir,
}: {
  row: PipelineRow;
  previewAtivo?: boolean;
  density: Density;
  href: string;
  /** Abre no painel contextual in-place (clique simples, sem modificador). */
  onAbrir?: () => void;
}) {
  const previewRef = useLinhaPreview(previewAtivo);
  const compact = density === "compacto";
  return (
    <div
      ref={previewRef}
      aria-current={previewAtivo ? "true" : undefined}
      data-preview-active={previewAtivo || undefined}
      className={cn(
        "@container cursor-pointer pr-3 pl-4 transition-colors",
        previewAtivo
          ? "bg-primary/8 ring-primary/50 ring-2 ring-inset"
          : "hover:bg-muted/40",
        compact ? "py-3" : "py-4",
      )}
      onClick={(e) => onClickAbrirLinha(e, onAbrir)}
    >
      <div className="flex items-stretch gap-3 @max-[640px]:flex-col @max-[640px]:gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 @max-[640px]:flex-none">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <CategoriaChip
              categoria={row.categoria}
              label={row.categoriaLabel}
            />
            {previewAtivo ? (
              <span className="text-primary text-[11px] font-medium">
                Em prévia
              </span>
            ) : null}
            <Link
              href={href}
              title={row.title}
              onClick={(e) => onClickAbrirPainel(e, onAbrir)}
              className="font-display text-foreground hover:text-primary min-w-0 flex-1 basis-40 truncate text-[14.5px] leading-snug font-medium underline-offset-4 outline-none hover:underline"
            >
              {row.title}
            </Link>
          </div>
          <div className="text-fg3 flex min-w-0 flex-wrap items-center gap-1.5 text-[11.5px]">
            <span className="min-w-0 truncate font-mono">{row.meta}</span>
            <span aria-hidden className="shrink-0">
              ·
            </span>
            <span className="text-foreground/70 shrink-0 truncate">
              {row.atoPublicacao}
            </span>
            <span
              className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                color: row.estado.cor,
                backgroundColor: row.estado.fundo,
              }}
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

        {/* COLUNA DIREITA (só leitura): responsável e prazo LADO A LADO,
            centrados verticalmente — mesmo eixo da linha ativa, sem menu de
            atribuição nem ações. Reusa o canônico Responsavel (display). */}
        <div className="flex w-[340px] shrink-0 items-center justify-center gap-3 @max-[640px]:w-full @max-[640px]:pl-7">
          <div className="flex max-w-[190px] min-w-0 flex-1 justify-center">
            <Responsavel value={row.responsavelId} nome={row.responsavelNome} />
          </div>
          <PrazoDestaque prazo={row.prazo} dense={compact} />
        </div>
      </div>
    </div>
  );
}
