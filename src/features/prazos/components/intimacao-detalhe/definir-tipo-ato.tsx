"use client";

// Control "Definir tipo do ato" — DISCRETO e SEMPRE disponível: o usuário escolhe,
// ele mesmo, o tipo do ato (e o prazo) da intimação. É o que limpa a pré-condição
// ACT_TYPE_NOT_DEFINED do BE. Usado (a) inline no pre-flight da peça (Check 1) e
// (b) como control autônomo no detalhe. Dropdown = shadcn Select (nunca <select>
// nativo). Só JSX + binding; a lógica vive em useDefinirTipo.

import { Check, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefinirTipo } from "@/features/prazos/hooks/use-definir-tipo";
import { formatarData } from "@/lib/utils";

import type { PrazoDetalheView } from "../../types";

export function DefinirTipoAto({
  intimacaoId,
  prazo,
  onConfirmado,
  /** Rótulo do CTA — o gate usa "Confirmar e continuar". */
  ctaLabel = "Definir tipo e prazo",
  /** Compacto = sem o control de contagem (usado no gate). */
  compact = false,
}: {
  intimacaoId: string;
  prazo: PrazoDetalheView | null;
  onConfirmado?: () => void;
  ctaLabel?: string;
  compact?: boolean;
}) {
  const c = useDefinirTipo({ intimacaoId, prazo, onConfirmado });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="definir-tipo-ato"
            className="text-muted-foreground text-xs font-medium"
          >
            Tipo do ato
          </label>
          <Select value={c.tipo} onValueChange={(v) => c.setTipo(v ?? "")}>
            <SelectTrigger id="definir-tipo-ato" className="w-full">
              <SelectValue placeholder="Selecione o tipo">
                {c.options.find(([t]) => t === c.tipo)?.[1] ??
                  "Selecione o tipo"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {c.options.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="definir-tipo-dias"
            className="text-muted-foreground text-xs font-medium"
          >
            Prazo em dias
          </label>
          <Input
            id="definir-tipo-dias"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Informe os dias"
            value={c.days ?? ""}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              c.setDays(Number.isNaN(v) ? undefined : v);
            }}
          />
        </div>
      </div>

      {compact ? null : (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="definir-tipo-contagem"
            className="text-muted-foreground text-xs font-medium"
          >
            Contagem
          </label>
          <Select
            value={c.counting}
            onValueChange={(v) =>
              c.setCounting((v as "BUSINESS" | "CALENDAR") ?? "BUSINESS")
            }
          >
            <SelectTrigger
              id="definir-tipo-contagem"
              className="w-full sm:w-56"
            >
              <SelectValue>
                {c.counting === "CALENDAR" ? "Dias corridos" : "Dias úteis"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="BUSINESS">Dias úteis</SelectItem>
                <SelectItem value="CALENDAR">Dias corridos</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        className="text-muted-foreground text-sm"
      >
        {c.previewPendente
          ? "Calculando vencimento…"
          : c.previewErro
            ? "Não foi possível calcular o vencimento."
            : c.preview
              ? `Vencimento previsto: ${formatarData(c.preview.end_date)} · ${c.preview.weekday}.`
              : "Escolha o tipo e informe os dias para ver o vencimento."}
        {c.previewErro ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 block"
            onClick={c.onRetryPreview}
          >
            Recalcular
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!c.podeConfirmar} onClick={c.onConfirmar}>
          {c.emVoo ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Check data-icon="inline-start" />
          )}
          {c.emVoo ? "Salvando…" : ctaLabel}
        </Button>
        {c.podeSemPrazo ? (
          <Button
            type="button"
            variant="ghost"
            disabled={c.emVoo}
            onClick={c.onSemPrazo}
          >
            Não há prazo
          </Button>
        ) : null}
      </div>

      {c.erro ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível salvar. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}
