"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";

import { onboardingCopy } from "../copy";
import { useCompanyForm } from "../hooks/use-company-form";

const t = onboardingCopy.step2;
const common = onboardingCopy.common;

export function Step2Company({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const {
    register,
    submit,
    errors,
    onCnpjBlur,
    onCepBlur,
    isLookingUpCnpj,
    lookupFailed,
    isPreparing,
    isReady,
    orgError,
    profileError,
  } = useCompanyForm({ onDone });

  const cnpj = register("cnpj");
  const cep = register("address.cep");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div>
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-muted-foreground text-sm">{t.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cnpj">{t.fields.cnpj.label}</Label>
        <Input
          id="cnpj"
          inputMode="numeric"
          placeholder={t.fields.cnpj.placeholder}
          aria-invalid={errors.cnpj ? true : undefined}
          aria-describedby="cnpj-help"
          {...cnpj}
          onBlur={(e) => {
            cnpj.onBlur(e);
            void onCnpjBlur();
          }}
        />
        <p id="cnpj-help" className="text-muted-foreground text-xs">
          {isLookingUpCnpj ? t.fields.cnpj.searching : t.fields.cnpj.help}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="trade_name">{t.fields.tradeName.label}</Label>
          <Input
            id="trade_name"
            aria-invalid={errors.trade_name ? true : undefined}
            {...register("trade_name")}
          />
          {errors.trade_name ? (
            <p className="text-destructive text-sm">
              {errors.trade_name.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="legal_name">{t.fields.legalName.label}</Label>
          <Input
            id="legal_name"
            aria-invalid={errors.legal_name ? true : undefined}
            {...register("legal_name")}
          />
          {errors.legal_name ? (
            <p className="text-destructive text-sm">
              {errors.legal_name.message}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-medium">
          {t.fields.address.legend}
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cep">{t.fields.address.cep.label}</Label>
            <Input
              id="cep"
              inputMode="numeric"
              placeholder={t.fields.address.cep.placeholder}
              aria-invalid={errors.address?.cep ? true : undefined}
              {...cep}
              onBlur={(e) => {
                cep.onBlur(e);
                void onCepBlur();
              }}
            />
            {errors.address?.cep ? (
              <p className="text-destructive text-sm">
                {errors.address.cep.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="logradouro">
              {t.fields.address.logradouro.label}
            </Label>
            <Input
              id="logradouro"
              autoComplete="address-line1"
              aria-invalid={errors.address?.logradouro ? true : undefined}
              {...register("address.logradouro")}
            />
            {errors.address?.logradouro ? (
              <p className="text-destructive text-sm">
                {errors.address.logradouro.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">{t.fields.address.numero.label}</Label>
            <Input id="numero" {...register("address.numero")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="complemento">
              {t.fields.address.complemento.label}
            </Label>
            <Input id="complemento" {...register("address.complemento")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_2fr_1fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bairro">{t.fields.address.bairro.label}</Label>
            <Input id="bairro" {...register("address.bairro")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cidade">{t.fields.address.cidade.label}</Label>
            <Input
              id="cidade"
              aria-invalid={errors.address?.cidade ? true : undefined}
              {...register("address.cidade")}
            />
            {errors.address?.cidade ? (
              <p className="text-destructive text-sm">
                {errors.address.cidade.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="uf">{t.fields.address.uf.label}</Label>
            <Input
              id="uf"
              maxLength={2}
              autoCapitalize="characters"
              aria-invalid={errors.address?.uf ? true : undefined}
              {...register("address.uf")}
            />
            {errors.address?.uf ? (
              <p className="text-destructive text-sm">
                {errors.address.uf.message}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

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

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isPreparing}
        >
          {common.back}
        </Button>
        <Button type="submit" disabled={isPreparing || !isReady}>
          {isPreparing ? common.preparing : common.next}
        </Button>
      </div>
    </form>
  );
}
