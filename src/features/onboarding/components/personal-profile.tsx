"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  type PersonalUser,
  usePersonalProfile,
} from "../hooks/use-personal-profile";

export function PersonalProfile({
  user,
  onComplete,
}: {
  user: PersonalUser;
  onComplete: () => void;
}) {
  const { form, submit, error, saving } = usePersonalProfile(user, onComplete);
  const { register, formState } = form;
  const id = useId();
  const firstNameId = `${id}-first-name`;
  const lastNameId = `${id}-last-name`;
  const emailId = `${id}-email`;
  const firstNameErrorId = `${firstNameId}-error`;
  const lastNameErrorId = `${lastNameId}-error`;

  return (
    <main className="bg-bg grid min-h-screen place-items-center p-6">
      <form
        onSubmit={submit}
        className="surface-panel w-full max-w-md space-y-4 p-6"
      >
        <h1 className="font-display text-xl">Complete seu perfil</h1>
        <p className="text-muted-foreground text-sm">
          Informe seu nome para entrar no escritório.
        </p>
        <Field>
          <FieldLabel htmlFor={firstNameId}>Nome</FieldLabel>
          <Input
            id={firstNameId}
            autoComplete="given-name"
            aria-invalid={!!formState.errors.firstName}
            aria-describedby={
              formState.errors.firstName ? firstNameErrorId : undefined
            }
            {...register("firstName")}
          />
          <FieldError id={firstNameErrorId}>
            {formState.errors.firstName?.message}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={lastNameId}>Sobrenome</FieldLabel>
          <Input
            id={lastNameId}
            autoComplete="family-name"
            aria-invalid={!!formState.errors.lastName}
            aria-describedby={
              formState.errors.lastName ? lastNameErrorId : undefined
            }
            {...register("lastName")}
          />
          <FieldError id={lastNameErrorId}>
            {formState.errors.lastName?.message}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={emailId}>E-mail</FieldLabel>
          <Input
            id={emailId}
            type="email"
            value={user?.primaryEmailAddress?.emailAddress ?? ""}
            readOnly
          />
        </Field>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Concluir perfil"}
        </Button>
      </form>
    </main>
  );
}
