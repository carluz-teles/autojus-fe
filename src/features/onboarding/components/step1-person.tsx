"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { usePersonForm } from "../hooks/use-person-form";

export function Step1Person({ onDone }: { onDone: () => void }) {
  const { register, submit, errors, isSubmitting, isReady, submitError } =
    usePersonForm({ onDone });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first_name">Nome</Label>
          <Input
            id="first_name"
            autoComplete="given-name"
            aria-invalid={errors.first_name ? true : undefined}
            {...register("first_name")}
          />
          {errors.first_name ? (
            <p className="text-destructive text-sm">
              {errors.first_name.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="last_name">Sobrenome</Label>
          <Input
            id="last_name"
            autoComplete="family-name"
            aria-invalid={errors.last_name ? true : undefined}
            {...register("last_name")}
          />
          {errors.last_name ? (
            <p className="text-destructive text-sm">
              {errors.last_name.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">
          Telefone{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          {...register("phone")}
        />
      </div>

      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isReady}>
          {isSubmitting ? "Salvando…" : "Continuar"}
        </Button>
      </div>
    </form>
  );
}
