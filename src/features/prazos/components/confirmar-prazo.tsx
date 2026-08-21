"use client";

import {
  CalendarCheck,
  CalendarOff,
  CircleAlert,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { useConfirmarPrazo } from "../hooks/use-confirmar-prazo";
import {
  ANCHOR_OPTIONS,
  COUNTING_OPTIONS,
  useConfirmarPrazoForm,
} from "../hooks/use-confirmar-prazo-form";
import { useNoDeadlinePrazo } from "../hooks/use-no-deadline-prazo";
import { usePrazoDaIntimacao } from "../hooks/use-prazo-da-intimacao";
import { useReopenPrazo } from "../hooks/use-reopen-prazo";
import { kindLabel } from "../lib/labels";
import type {
  PrazoAnchorEvent,
  PrazoCounting,
  PrazoDetalheView,
  PrazoView,
} from "../types";
import { PrazoCardSkeleton } from "./prazo-card";

// ── Helpers de data seguros (UTC, como prazo-card.tsx) ──

function fmtDateUTC(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

function fmtDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}

/** Retorna o dia da semana por extenso (UTC) para uma data ISO. */
function weekdayUTC(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        timeZone: "UTC",
      }).format(d);
}

/** Rótulo pt-BR do evento de ancoragem. */
const ANCHOR_LABEL: Record<PrazoAnchorEvent, string> = {
  MADE_AVAILABLE: "Disponibilização",
  PUBLISHED: "Publicação",
  DEADLINE_START: "Termo derivado",
};

const COUNTING_LABEL: Record<PrazoCounting, string> = {
  BUSINESS: "dias úteis",
  CALENDAR: "dias corridos",
};

// ─────────────────────────────────────────────
// Componente principal — orquestra os 4 estados
// ─────────────────────────────────────────────

/**
 * Painel F2 — Máquina de estados do prazo. Quatro estados, mesmo painel:
 *  • "pending"     → sugerido, fundo gold, botões confirmar/ajustar/sem prazo
 *  • "editing"     → form inline (anchor + contagem + dobro + feriado + preview ao vivo)
 *  • "confirmed"   → OPEN, fundo verde, auditoria, botões editar/remover
 *  • "no_deadline" → mera ciência, fundo muted, auditoria, botão reabrir
 */
export function ConfirmarPrazo({ intimationId }: { intimationId: string }) {
  const { state, prazo, detalhe } = usePrazoDaIntimacao(intimationId);
  // "editing" é estado local — UI layer; o servidor não tem esse estado
  const [isEditing, setIsEditing] = useState(false);

  if (state === "loading") return <PrazoCardSkeleton />;

  if (state === "error") {
    return (
      <p className="text-muted-foreground text-sm" role="alert">
        Não foi possível carregar o prazo desta intimação. Tente novamente.
      </p>
    );
  }

  if (state === "empty" || !prazo) {
    return (
      <div className="text-muted-foreground flex items-start gap-2 rounded-xl border border-dashed p-4 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          O prazo desta intimação ainda não foi derivado. Assim que a análise
          calcular o vencimento, ele aparece aqui para você confirmar.
        </p>
      </div>
    );
  }

  if (state === "no_deadline") {
    return <PainelMeraCiencia prazo={prazo} />;
  }

  if (state === "confirmed" && !isEditing) {
    return <PainelConfirmado prazo={prazo} onEdit={() => setIsEditing(true)} />;
  }

  // state === "pending" OU "confirmed" com isEditing=true
  if (isEditing || state === "pending") {
    const prazoParaForm = detalhe ?? prazo;
    return (
      <PainelSugerido
        intimationId={intimationId}
        prazo={prazo}
        prazoParaForm={prazoParaForm}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onCancelEditing={() => setIsEditing(false)}
        onConfirmed={() => setIsEditing(false)}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────
// Estado 1+2: Sugerido / Editando
// ─────────────────────────────────────────

function PainelSugerido({
  intimationId,
  prazo,
  prazoParaForm,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onConfirmed,
}: {
  intimationId: string;
  prazo: PrazoView;
  prazoParaForm: PrazoView | PrazoDetalheView;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onConfirmed: () => void;
}) {
  const noDeadline = useNoDeadlinePrazo();
  const confirmarDireto = useConfirmarPrazo();

  // "Confirmar prazo" = aceitar a sugestão da regra em 1 clique, SEM abrir o form.
  // Usa os valores derivados (kind/days/counting/dobro/âncora/extra) como estão.
  // "Ajustar" (onStartEditing) é o caminho que abre o form pra editar antes.
  function handleConfirmDirect() {
    const d = prazoParaForm as PrazoDetalheView;
    confirmarDireto.confirmar(
      {
        intimation_id: intimationId,
        deadline: {
          kind: prazo.kind,
          days: prazo.days ?? d.days,
          counting: prazo.counting,
          doubled: prazo.doubled,
          doubled_reason: prazo.doubled_reason || undefined,
          anchor_event: prazo.anchor_event,
          manual_extra_days: prazo.manual_extra_days ?? d.manual_extra_days,
        },
        tasks: [],
      },
      {
        onSuccess: () => {
          toast.success("Prazo confirmado.");
          onConfirmed();
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Não foi possível confirmar o prazo. Tente novamente.",
          );
        },
      },
    );
  }

  function handleNoDeadline() {
    noDeadline.declarar(prazo.id, {
      onSuccess: () => {
        toast.success("Intimação marcada como mera ciência.");
        onConfirmed();
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Não foi possível declarar mera ciência. Tente novamente.";
        toast.error(msg);
      },
    });
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
          Ajustar prazo
        </p>
        <FormAjuste
          intimationId={intimationId}
          prazo={prazoParaForm}
          onCancel={onCancelEditing}
          onConfirmed={onConfirmed}
        />
      </div>
    );
  }

  // Estado sugerido (read-only com derivação)
  const endDate = prazo.end_date;
  const startDate =
    prazo.start_date ?? (prazoParaForm as PrazoDetalheView).start_date;
  const days = prazo.days ?? (prazoParaForm as PrazoDetalheView).days;
  const legalCitation =
    prazo.legal_citation ?? (prazoParaForm as PrazoDetalheView).legal_citation;
  const anchorEvent = prazo.anchor_event;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-4"
      style={{
        background: "color-mix(in oklch, var(--gold) 8%, transparent)",
        borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)",
      }}
    >
      {/* Rótulo de estado */}
      <div className="flex items-center gap-2">
        <CircleAlert
          className="size-3.5 shrink-0"
          style={{ color: "var(--gold-foreground)" }}
        />
        <span
          className="text-[11px] font-medium tracking-widest uppercase"
          style={{ color: "var(--gold-foreground)" }}
        >
          Prazo sugerido · aguardando confirmação
        </span>
      </div>

      {/* Data grande em Fraunces */}
      <div>
        <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
          Termo final
        </p>
        <div className="flex items-end gap-3">
          <span className="font-display text-foreground text-4xl leading-none tabular-nums">
            {fmtDateUTC(endDate)}
          </span>
          <span className="text-muted-foreground mb-0.5 text-sm capitalize">
            {weekdayUTC(endDate)}
          </span>
        </div>
      </div>

      {/* Grid de derivação */}
      {days != null || anchorEvent || startDate ? (
        <div className="border-border/60 bg-background/50 grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm">
          <DerivacaoItem label="Tipo" value={kindLabel(prazo.kind)} />
          <DerivacaoItem
            label="Termo inicial"
            value={
              anchorEvent
                ? `${ANCHOR_LABEL[anchorEvent]}${startDate ? ` · ${fmtDateUTC(startDate)}` : ""}`
                : startDate
                  ? fmtDateUTC(startDate)
                  : "—"
            }
          />
          <DerivacaoItem
            label="Contagem"
            value={
              days != null
                ? `${days} ${COUNTING_LABEL[prazo.counting]}`
                : COUNTING_LABEL[prazo.counting]
            }
          />
        </div>
      ) : null}

      {/* Regra legal */}
      {legalCitation ? (
        <p
          className="text-muted-foreground border-l-2 pl-3 text-xs"
          style={{
            borderColor: "color-mix(in oklch, var(--gold) 50%, transparent)",
          }}
        >
          Regra aplicada:{" "}
          <span className="text-foreground/80 font-medium">
            {legalCitation}
          </span>
        </p>
      ) : null}

      {/* Ações */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleConfirmDirect}
          disabled={confirmarDireto.isPending}
          className="gap-1.5"
        >
          <CalendarCheck className="size-4" />
          Confirmar prazo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onStartEditing}
          className="gap-1.5"
        >
          <Pencil className="size-4" />
          Ajustar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNoDeadline}
          disabled={noDeadline.isPending}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          {noDeadline.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarOff className="size-4" />
          )}
          Não há prazo
        </Button>
      </div>
    </div>
  );
}

function DerivacaoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground/90 text-sm leading-snug">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────
// Estado 2: Form inline de ajuste
// ─────────────────────────────────────────

function FormAjuste({
  intimationId,
  prazo,
  onCancel,
  onConfirmed,
}: {
  intimationId: string;
  prazo: PrazoView | PrazoDetalheView;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const {
    register,
    setValue,
    errors,
    submit: submitRaw,
    doubled,
    setDoubled,
    kind,
    counting,
    setCounting,
    anchorEvent,
    setAnchorEvent,
    hasHolidays,
    setHasHolidays,
    manualExtraDays,
    doubledReason,
    kindOptions,
    doubledReasonOptions,
    preview,
    previewPending,
    isPending,
    error,
  } = useConfirmarPrazoForm({ intimationId, prazo });

  // Wraps submit: chama onConfirmed no sucesso implícito (invalidação de query
  // já é feita pelo useConfirmarPrazo — o painel re-renderiza para "confirmed").
  // Como useMutation não expõe onSuccess diretamente aqui, ouvimos via form.handleSubmit.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitRaw(e);
    // onConfirmed é chamado após invalidação — o componente pai transiciona sozinho
    // via state derivado do React Query. Fechamos o modo edição.
    onConfirmed();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
      {/* Tipo de prazo + Termo inicial (2 colunas) */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prazo_kind">Tipo de prazo</Label>
          <Select
            value={kind}
            items={Object.fromEntries(
              kindOptions.map((k) => [k.value, kindLabel(k.value)]),
            )}
            onValueChange={(v) =>
              v != null &&
              setValue("kind", v, { shouldDirty: true, shouldValidate: true })
            }
          >
            <SelectTrigger
              id="prazo_kind"
              className="w-full"
              aria-invalid={errors.kind ? true : undefined}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {kindOptions.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {kindLabel(k.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.kind ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.kind.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prazo_anchor">Termo inicial</Label>
          <Select
            value={anchorEvent}
            items={ANCHOR_LABEL}
            onValueChange={(v) =>
              v != null && setAnchorEvent(v as PrazoAnchorEvent)
            }
          >
            <SelectTrigger id="prazo_anchor" className="w-full">
              <SelectValue placeholder="Selecione o termo" />
            </SelectTrigger>
            <SelectContent>
              {ANCHOR_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dias + Contagem (2 colunas) */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prazo_days">Dias</Label>
          <Input
            id="prazo_days"
            type="number"
            min={1}
            inputMode="numeric"
            aria-invalid={errors.days ? true : undefined}
            {...register("days", { valueAsNumber: true })}
          />
          {errors.days ? (
            <p className="text-destructive text-sm" role="alert">
              {errors.days.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Contagem</Label>
          <div
            role="group"
            aria-label="Regime de contagem"
            className="bg-muted/60 grid grid-cols-2 gap-1 rounded-lg border p-1"
          >
            {COUNTING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={counting === opt.value}
                onClick={() => setCounting(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  counting === opt.value
                    ? "bg-card text-foreground border shadow-xs"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles inline: em dobro · feriado */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={doubled}
            onCheckedChange={(value) => setDoubled(value === true)}
          />
          <span>Prazo em dobro (art. 186/229, CPC)</span>
        </Label>
        <Label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={hasHolidays}
            onCheckedChange={(value) => setHasHolidays(value === true)}
          />
          <span>Feriado local / suspensão forense</span>
        </Label>
      </div>

      {/* Sub-campos condicionais (compactos, 2 colunas) */}
      {doubled || hasHolidays ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {doubled ? (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="prazo_reason"
                className="text-muted-foreground text-xs"
              >
                Motivo do dobro
              </Label>
              <Select
                value={doubledReason}
                onValueChange={(v) =>
                  v != null &&
                  setValue("doubled_reason", v, { shouldDirty: true })
                }
              >
                <SelectTrigger id="prazo_reason" className="w-full">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {doubledReasonOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {hasHolidays ? (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="prazo_holidays"
                className="text-muted-foreground text-xs"
              >
                Dias extras
              </Label>
              <Input
                id="prazo_holidays"
                type="number"
                min={1}
                inputMode="numeric"
                {...register("manual_extra_days", { valueAsNumber: true })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TERMO FINAL CALCULADO ao vivo */}
      <div
        className="flex flex-col gap-2 rounded-xl border p-4"
        style={{
          background: "color-mix(in oklch, var(--primary) 5%, transparent)",
          borderColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
        }}
      >
        <p className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
          Termo final calculado
        </p>
        {previewPending ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>Calculando…</span>
          </div>
        ) : preview ? (
          <>
            <div className="flex items-end gap-3">
              <span className="font-display text-foreground text-3xl leading-none tabular-nums">
                {fmtDateUTC(preview.end_date)}
              </span>
              <span className="text-muted-foreground mb-0.5 text-sm capitalize">
                {preview.weekday || weekdayUTC(preview.end_date)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {manualExtraDays > 0 && hasHolidays
                ? `${(prazo as PrazoDetalheView).days ?? ""} dias úteis a partir de ${ANCHOR_LABEL[anchorEvent]} · +${manualExtraDays} dia(s) extra(s)`
                : `${(prazo as PrazoDetalheView).days ?? ""} dias úteis a partir de ${ANCHOR_LABEL[anchorEvent]}`}
            </p>
            <p className="text-muted-foreground mt-1 border-t pt-2 text-xs">
              Ao confirmar, as providências vinculadas passam a vencer em{" "}
              <strong className="text-foreground">
                {fmtDateUTC(preview.end_date)}
              </strong>
              .
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            Preencha os campos acima para ver o vencimento calculado.
          </p>
        )}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof ApiError
            ? error.message
            : "Não foi possível confirmar. Tente novamente."}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className={cn("gap-1.5", isPending && "opacity-70")}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarCheck className="size-4" />
          )}
          {isPending ? "Confirmando…" : "Salvar e confirmar prazo"}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────
// Estado 3: Confirmado (OPEN)
// ─────────────────────────────────────────

function PainelConfirmado({
  prazo,
  onEdit,
}: {
  prazo: PrazoView;
  onEdit: () => void;
}) {
  const noDeadline = useNoDeadlinePrazo();

  function handleRemove() {
    noDeadline.declarar(prazo.id, {
      onSuccess: () =>
        toast.success("Prazo removido — intimação marcada como mera ciência."),
      onError: (err) => {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Não foi possível remover o prazo. Tente novamente.";
        toast.error(msg);
      },
    });
  }

  const confirmedAt = prazo.confirmed_at;
  const confirmedBy = prazo.confirmed_by_name;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-4"
      style={{
        background: "oklch(0.45 0.1 150 / 7%)",
        borderColor: "oklch(0.45 0.1 150 / 25%)",
      }}
    >
      {/* Rótulo */}
      <div className="flex items-center gap-2">
        <CalendarCheck
          className="size-3.5 shrink-0"
          style={{ color: "oklch(0.45 0.1 150)" }}
        />
        <span
          className="text-[11px] font-medium tracking-widest uppercase"
          style={{ color: "oklch(0.45 0.1 150)" }}
        >
          Prazo confirmado
        </span>
      </div>

      {/* Data grande */}
      <div>
        <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wider uppercase">
          Fatal em
        </p>
        <div className="flex items-end gap-3">
          <span className="font-display text-foreground text-4xl leading-none tabular-nums">
            {fmtDateUTC(prazo.end_date)}
          </span>
          <span className="text-muted-foreground mb-0.5 text-sm capitalize">
            {weekdayUTC(prazo.end_date)}
          </span>
        </div>
      </div>

      {/* Auditoria */}
      {confirmedBy || confirmedAt ? (
        <p className="text-muted-foreground text-xs">
          {confirmedBy && confirmedAt
            ? `Confirmado por ${confirmedBy} · ${fmtDateTimeLocal(confirmedAt)}`
            : confirmedBy
              ? `Confirmado por ${confirmedBy}`
              : confirmedAt
                ? `Confirmado em ${fmtDateTimeLocal(confirmedAt)}`
                : null}
        </p>
      ) : null}

      {/* Ações */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="gap-1.5"
        >
          <Pencil className="size-4" />
          Editar prazo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemove}
          disabled={noDeadline.isPending}
          className="text-destructive hover:text-destructive gap-1.5"
        >
          {noDeadline.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Remover prazo
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Estado 4: Mera ciência (NO_DEADLINE)
// ─────────────────────────────────────────

function PainelMeraCiencia({ prazo }: { prazo: PrazoView }) {
  const reopen = useReopenPrazo();

  function handleReopen() {
    reopen.reabrir(prazo.id, {
      onSuccess: () =>
        toast.success("Prazo reaberto — aguardando confirmação."),
      onError: (err) => {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Não foi possível reabrir. Tente novamente.";
        toast.error(msg);
      },
    });
  }

  const confirmedBy = prazo.confirmed_by_name;
  const confirmedAt = prazo.confirmed_at;

  return (
    <div className="bg-muted/40 flex flex-col gap-4 rounded-xl border p-4">
      {/* Rótulo */}
      <div className="flex items-center gap-2">
        <CalendarOff className="text-muted-foreground size-3.5 shrink-0" />
        <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
          Sem prazo — mera ciência
        </span>
      </div>

      <p className="text-muted-foreground text-sm">
        Esta intimação foi declarada sem prazo a cumprir.
      </p>

      {/* Auditoria */}
      {confirmedBy || confirmedAt ? (
        <p className="text-muted-foreground text-xs">
          {confirmedBy && confirmedAt
            ? `Declarado sem prazo por ${confirmedBy} · ${fmtDateTimeLocal(confirmedAt)}`
            : confirmedBy
              ? `Declarado sem prazo por ${confirmedBy}`
              : confirmedAt
                ? `Declarado sem prazo em ${fmtDateTimeLocal(confirmedAt)}`
                : null}
        </p>
      ) : null}

      {/* Ação */}
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleReopen}
          disabled={reopen.isPending}
          className="gap-1.5"
        >
          {reopen.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Adicionar prazo mesmo assim
        </Button>
      </div>
    </div>
  );
}
