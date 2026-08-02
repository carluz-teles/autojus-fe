"use client";

import { Pencil, UserRound } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { onboardingCopy } from "../copy";
import { usePersonForm } from "../hooks/use-person-form";

const t = onboardingCopy.step1;
const common = onboardingCopy.common;

export function Step1Person({ onDone }: { onDone: () => void }) {
  const {
    register,
    submit,
    errors,
    isSubmitting,
    isReady,
    submitError,
    photoUrl,
    selectPhoto,
  } = usePersonForm({ onDone });
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={submit}
      className="flex flex-col items-center gap-8"
      noValidate
    >
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
      </div>

      {/* Avatar central com overlay de edição — a foto só sobe no Continuar. */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          aria-label={t.photo.edit}
          onClick={() => fileRef.current?.click()}
          className="group focus-visible:ring-ring/50 relative rounded-full outline-none focus-visible:ring-3"
        >
          <span className="bg-muted ring-border flex size-24 items-center justify-center overflow-hidden rounded-full ring-1">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={t.photo.alt}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="text-muted-foreground/60 size-10" />
            )}
          </span>
          <span className="bg-primary text-primary-foreground ring-card absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full shadow-sm ring-4 transition-transform group-hover:scale-110">
            <Pencil className="size-3.5" />
          </span>
        </button>
        <p className="text-muted-foreground text-xs">{t.photo.hint}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selectPhoto(file);
            e.target.value = ""; // permite re-escolher o mesmo arquivo
          }}
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first_name">{t.fields.firstName.label}</Label>
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
          <Label htmlFor="last_name">{t.fields.lastName.label}</Label>
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

      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !isReady}
      >
        {isSubmitting ? common.saving : common.next}
      </Button>
    </form>
  );
}
