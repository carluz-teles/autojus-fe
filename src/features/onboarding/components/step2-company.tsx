"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { maskCep, maskCnpj, maskPhone } from "@/lib/masks";

import { BR_UFS, onboardingCopy } from "../copy";
import { useCompanyForm } from "../hooks/use-company-form";

const t = onboardingCopy.company;
const common = onboardingCopy.common;

export function Step2Company({ onDone }: { onDone: () => void }) {
  const {
    register,
    submit,
    errors,
    onCnpjBlur,
    onCepBlur,
    isCnpjLoading,
    isCepLoading,
    lookupFailed,
    isPreparing,
    isReady,
    orgError,
    profileError,
  } = useCompanyForm({ onDone });

  const cnpj = register("cnpj");
  const phone = register("phone");
  const cep = register("address.cep");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">{t.fields.cnpj.label}</Label>
          <div className="relative">
            <Input
              id="cnpj"
              inputMode="numeric"
              placeholder={t.fields.cnpj.placeholder}
              aria-invalid={errors.cnpj ? true : undefined}
              aria-describedby="cnpj-help"
              className={isCnpjLoading ? "pr-9" : undefined}
              {...cnpj}
              onChange={(e) => {
                e.target.value = maskCnpj(e.target.value);
                void cnpj.onChange(e);
              }}
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="trade_name">{t.fields.tradeName.label}</Label>
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="legal_name">{t.fields.legalName.label}</Label>
          <Input
            id="legal_name"
            disabled={isCnpjLoading}
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

      {/* Endereço no padrão BR de checkout: CEP primeiro e sozinho (é ele que
          busca o resto), Logradouro largo + Número curto, Complemento/Bairro
          50-50, Cidade larga + UF curta — linhas espelhadas (3+1 / 2+2 / 3+1). */}
      <fieldset className="mt-2 flex flex-col gap-5 border-t pt-6">
        <legend className="float-left mb-5 text-sm font-medium">
          {t.fields.address.legend}
        </legend>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cep">{t.fields.address.cep.label}</Label>
            <div className="relative">
              <Input
                id="cep"
                inputMode="numeric"
                placeholder={t.fields.address.cep.placeholder}
                disabled={isCnpjLoading}
                aria-invalid={errors.address?.cep ? true : undefined}
                className={isCepLoading ? "pr-9" : undefined}
                {...cep}
                onChange={(e) => {
                  e.target.value = maskCep(e.target.value);
                  void cep.onChange(e);
                }}
                onBlur={(e) => {
                  cep.onBlur(e);
                  void onCepBlur();
                }}
              />
              {isCepLoading ? (
                <LoaderCircle
                  aria-hidden
                  className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
                />
              ) : null}
            </div>
            {errors.address?.cep ? (
              <p className="text-destructive text-sm">
                {errors.address.cep.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label htmlFor="logradouro">
              {t.fields.address.logradouro.label}
            </Label>
            <Input
              id="logradouro"
              autoComplete="address-line1"
              disabled={isCnpjLoading || isCepLoading}
              aria-invalid={errors.address?.logradouro ? true : undefined}
              {...register("address.logradouro")}
            />
            {errors.address?.logradouro ? (
              <p className="text-destructive text-sm">
                {errors.address.logradouro.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">{t.fields.address.numero.label}</Label>
            <Input
              id="numero"
              inputMode="numeric"
              disabled={isCnpjLoading}
              {...register("address.numero")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="complemento">
              {t.fields.address.complemento.label}
            </Label>
            <Input
              id="complemento"
              disabled={isCnpjLoading}
              {...register("address.complemento")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bairro">{t.fields.address.bairro.label}</Label>
            <Input
              id="bairro"
              disabled={isCnpjLoading || isCepLoading}
              {...register("address.bairro")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label htmlFor="cidade">{t.fields.address.cidade.label}</Label>
            <Input
              id="cidade"
              disabled={isCnpjLoading || isCepLoading}
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
            <select
              id="uf"
              disabled={isCnpjLoading || isCepLoading}
              aria-invalid={errors.address?.uf ? true : undefined}
              className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-lg border px-3 text-base shadow-xs transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
              defaultValue=""
              {...register("address.uf")}
            >
              <option value="" disabled>
                {t.fields.address.uf.placeholder}
              </option>
              {BR_UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
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
