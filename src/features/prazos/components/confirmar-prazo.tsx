"use client";

import { CalendarCheck, CircleAlert } from "lucide-react";

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
 * Painel F2 — confirmar prazo. No detalhe da intimação, mostra o prazo derivado e,
 * quando PENDING, o form pra ajustar (tipo, dias, em dobro) e confirmar. As tarefas
 * sugeridas saíram daqui e viraram fluxo próprio na Análise. Container só resolve o
 * estado (via hook) e delega o JSX de cada caso; toda a lógica vive nos hooks.
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
    doubled,
    setDoubled,
    kindOptions,
    doubledReasonOptions,
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

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof ApiError
            ? error.message
            : "Não foi possível confirmar. Tente novamente."}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className={cn(isPending && "opacity-70")}
        >
          <CalendarCheck /> {isPending ? "Confirmando…" : "Confirmar prazo"}
        </Button>
      </div>
    </form>
  );
}
