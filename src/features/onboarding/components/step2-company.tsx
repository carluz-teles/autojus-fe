"use client";

import { Building2, LoaderCircle, Pencil } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { maskPhone } from "@/lib/masks";

import { onboardingCopy } from "../copy";
import { useCompanyForm } from "../hooks/use-company-form";

const t = onboardingCopy.company;
const common = onboardingCopy.common;

export function Step2Company({ onDone }: { onDone: () => void }) {
  const {
    register,
    submit,
    errors,
    onCnpjBlur,
    isCnpjLoading,
    lookupFailed,
    isPreparing,
    isReady,
    orgError,
    profileError,
    logoPreview,
    selectLogo,
  } = useCompanyForm({ onDone });
  const logoRef = useRef<HTMLInputElement>(null);

  const cnpj = register("cnpj");
  const phone = register("phone");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
      </div>

      {/* Logo da organização — staged (preview local); sobe quando a org existe. */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          aria-label={t.logo.edit}
          onClick={() => logoRef.current?.click()}
          className="group focus-visible:ring-ring/50 relative rounded-2xl outline-none focus-visible:ring-3"
        >
          <span className="bg-muted ring-border flex size-24 items-center justify-center overflow-hidden rounded-2xl ring-1">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt={t.logo.alt}
                className="size-full object-cover"
              />
            ) : (
              <Building2 className="text-muted-foreground/60 size-10" />
            )}
          </span>
          <span className="bg-primary text-primary-foreground ring-card absolute -right-1.5 -bottom-1.5 flex size-8 items-center justify-center rounded-full shadow-sm ring-4 transition-transform group-hover:scale-110">
            <Pencil className="size-3.5" />
          </span>
        </button>
        <p className="text-muted-foreground text-xs">{t.logo.hint}</p>
        <input
          ref={logoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selectLogo(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trade_name">{t.fields.name.label}</Label>
        <Input
          id="trade_name"
          disabled={isCnpjLoading}
          aria-invalid={errors.trade_name ? true : undefined}
          {...register("trade_name")}
        />
        {errors.trade_name ? (
          <p className="text-destructive text-sm">
            {errors.trade_name.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">{t.fields.cnpj.label}</Label>
          <div className="relative">
            <Input
              id="cnpj"
              placeholder={t.fields.cnpj.placeholder}
              aria-invalid={errors.cnpj ? true : undefined}
              aria-describedby="cnpj-help"
              className={isCnpjLoading ? "pr-9" : undefined}
              {...cnpj}
              onBlur={(e) => {
                cnpj.onBlur(e);
                void onCnpjBlur();
              }}
            />
            {isCnpjLoading ? (
              <LoaderCircle
                aria-hidden
                className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
              />
            ) : null}
          </div>
          <p id="cnpj-help" className="text-muted-foreground text-xs">
            {isCnpjLoading ? t.fields.cnpj.searching : t.fields.cnpj.help}
          </p>
          {errors.cnpj ? (
            <p className="text-destructive text-sm">{errors.cnpj.message}</p>
          ) : null}
          {lookupFailed ? (
            <p
              className="text-sm text-amber-600 dark:text-amber-500"
              role="status"
            >
              {t.fields.cnpj.lookupFailed}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">{t.fields.phone.label}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t.fields.phone.placeholder}
            aria-invalid={errors.phone ? true : undefined}
            {...phone}
            onChange={(e) => {
              e.target.value = maskPhone(e.target.value);
              void phone.onChange(e);
            }}
          />
          {errors.phone ? (
            <p className="text-destructive text-sm">{errors.phone.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t.fields.email.label}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.fields.email.placeholder}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        ) : null}
      </div>

      {orgError ? (
        <p className="text-destructive text-sm" role="alert">
          {orgError}
        </p>
      ) : null}
      {profileError ? (
        <p className="text-destructive text-sm" role="alert">
          {profileError instanceof ApiError
            ? profileError.message
            : t.profileError}
        </p>
      ) : null}

      {isPreparing ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t.preparingAccount}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPreparing || !isReady}
      >
        {isPreparing ? common.preparing : common.next}
      </Button>
    </form>
  );
}
