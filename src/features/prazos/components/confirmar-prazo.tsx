"use client";

import {
  CalendarCheck,
  CircleAlert,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { useConfirmarPrazoForm } from "../hooks/use-confirmar-prazo-form";
import { usePrazoDaIntimacao } from "../hooks/use-prazo-da-intimacao";
import type { PrazoDetalheView } from "../types";
import { PrazoCard, PrazoCardSkeleton } from "./prazo-card";

/**
 * Painel F2 — "Aprovar tudo". No detalhe da intimação, mostra o prazo derivado e,
 * quando PENDING, o form pra ajustar (dias, contagem, em dobro) + montar as tarefas
 * e aprovar de uma vez. Container só resolve o estado (via hook) e delega o JSX de
 * cada caso; toda a lógica vive nos hooks.
 */
export function ConfirmarPrazo({ intimationId }: { intimationId: string }) {
  const { state, prazo, detalhe } = usePrazoDaIntimacao(intimationId);

  if (state === "loading") return <PrazoCardSkeleton />;

  if (state === "error") {
    return (
      <p className="text-muted-foreground text-sm">
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

  if (state === "confirmed") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CalendarCheck className="size-4 shrink-0" />
          <span className="font-medium">Prazo confirmado e em aberto.</span>
        </div>
        <PrazoCard prazo={prazo} />
        <Link
          href="/prazos"
          className="text-gold w-fit text-sm hover:underline"
        >
          Ver na agenda de prazos
        </Link>
      </div>
    );
  }

  // state === "pending" → o detalhe está garantido (o hook só entra aqui com ele).
  return (
    <ConfirmarPrazoForm
      intimationId={intimationId}
      detalhe={detalhe as PrazoDetalheView}
    />
  );
}

// Regime de contagem: segmentado com 2 botões (sem dep nova; toggle acessível).
const COUNTINGS: { value: "BUSINESS" | "CALENDAR"; label: string }[] = [
  { value: "BUSINESS", label: "Dias úteis" },
  { value: "CALENDAR", label: "Dias corridos" },
];

function ConfirmarPrazoForm({
  intimationId,
  detalhe,
}: {
  intimationId: string;
  detalhe: PrazoDetalheView;
}) {
  const {
    register,
    errors,
    submit,
    taskFields,
    addTask,
    removeTask,
    sugerindo,
    counting,
    setCounting,
    doubled,
    setDoubled,
    kindOptions,
    doubledReasonOptions,
    assigneeOptions,
    isPending,
    error,
  } = useConfirmarPrazoForm({ intimationId, detalhe });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {/* ── Prazo ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prazo_kind">Tipo do prazo</Label>
          <Select id="prazo_kind" {...register("kind")}>
            {kindOptions.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          {errors.kind ? (
            <p className="text-destructive text-sm">{errors.kind.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
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
            <p className="text-destructive text-sm">{errors.days.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Contagem</Label>
        <div className="bg-muted/50 inline-flex w-fit gap-1 rounded-lg border p-1">
          {COUNTINGS.map((c) => (
            <Button
              key={c.value}
              type="button"
              size="sm"
              variant={counting === c.value ? "default" : "ghost"}
              aria-pressed={counting === c.value}
              onClick={() => setCounting(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <Label className="flex items-center gap-2.5">
          <Checkbox
            checked={doubled}
            onCheckedChange={(value) => setDoubled(value === true)}
          />
          <span>Prazo em dobro</span>
        </Label>
        {doubled ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="prazo_reason" className="text-muted-foreground">
              Motivo
            </Label>
            <Select id="prazo_reason" {...register("doubled_reason")}>
              {doubledReasonOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {/* ── Tarefas (useFieldArray) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Tarefas</h4>
            {sugerindo ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Sparkles className="size-3 animate-pulse" /> sugerindo com IA…
              </span>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus /> Adicionar tarefa
          </Button>
        </div>

        {taskFields.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem tarefas — aprovar abre só o prazo.
          </p>
        ) : null}

        {taskFields.map((field, index) => (
          <div
            key={field.id}
            className="bg-card flex flex-col gap-3 rounded-xl border p-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  placeholder="Título da tarefa"
                  aria-invalid={errors.tasks?.[index]?.title ? true : undefined}
                  {...register(`tasks.${index}.title`)}
                />
                {errors.tasks?.[index]?.title ? (
                  <p className="text-destructive text-sm">
                    {errors.tasks[index]?.title?.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover tarefa"
                onClick={() => removeTask(index)}
              >
                <Trash2 />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                aria-label="Vencimento da tarefa"
                {...register(`tasks.${index}.due_date`)}
              />
              <Select
                aria-label="Responsável"
                {...register(`tasks.${index}.assignee_user_id`)}
              >
                <option value="">Sem responsável</option>
                {assigneeOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              placeholder="Descrição (opcional)"
              {...register(`tasks.${index}.description`)}
            />
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof ApiError
            ? error.message
            : "Não foi possível aprovar. Tente novamente."}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className={cn(isPending && "opacity-70")}
        >
          <Sparkles /> {isPending ? "Aprovando…" : "Aprovar tudo"}
        </Button>
      </div>
    </form>
  );
}
