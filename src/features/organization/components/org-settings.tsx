"use client";

import { useOrganization } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BR_UFS } from "@/lib/br";
import {
  EMPTY_ADDRESS,
  makeOrgProfileSchema,
  type OrgProfileFormValues,
  orgProfileToInput,
} from "@/lib/forms/org-profile";
import { maskCep, maskCnpj, maskPhone } from "@/lib/masks";

import { useOrgProfile } from "../hooks/use-org-profile";

// Mesma régua do onboarding (schema compartilhado); mensagens da página.
const schema = makeOrgProfileSchema({
  nameRequired: "Informe o nome do escritório.",
  cnpjInvalid: "CNPJ deve ter 14 dígitos.",
  phoneInvalid: "Telefone com 10 ou 11 dígitos.",
  emailInvalid: "Informe um e-mail válido.",
  cepInvalid: "CEP inválido.",
  logradouroRequired: "Informe o logradouro.",
  cidadeRequired: "Informe a cidade.",
  ufInvalid: "Selecione a UF.",
});

const selectClass =
  "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-lg border px-3 text-base shadow-xs transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 md:text-sm";

// Card "Dados do escritório" headless — logo editável (setLogo imediato, padrão
// do avatar) + perfil fiscal completo (nome/CNPJ/telefone/e-mail/endereço
// opcional), lido do GET /organization/profile e salvo no MESMO PUT do
// onboarding (schema compartilhado em lib/forms/org-profile). O nome sincroniza
// os dois donos: organization.update (Clerk) + trade_name (BE). Só admin.
export function OrgSettings() {
  const { isLoaded, organization, membership } = useOrganization();
  const {
    profile,
    isProfileLoading,
    profileLoadFailed,
    updateProfile,
    isSaving,
  } = useOrgProfile();

  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showAddress, setShowAddress] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const form = useForm<OrgProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trade_name: "",
      cnpj: "",
      phone: "",
      email: "",
      legal_name: "",
      address: { ...EMPTY_ADDRESS },
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = form;

  // Endereço visível quando o usuário abriu OU quando o form carrega com dados —
  // derivado do próprio form (useWatch), sem setState em effect.
  const addressValues = useWatch({ control, name: "address" });
  const addressVisible =
    showAddress ||
    Object.values(addressValues ?? {}).some((v) => (v ?? "").trim() !== "");

  // Pré-preenche quando o GET chega (mascarando o que é exibido formatado).
  useEffect(() => {
    if (!profile) return;
    const address = profile.address
      ? {
          cep: maskCep(profile.address.cep ?? ""),
          logradouro: profile.address.logradouro ?? "",
          numero: profile.address.numero ?? "",
          complemento: profile.address.complemento ?? "",
          bairro: profile.address.bairro ?? "",
          cidade: profile.address.cidade ?? "",
          uf: profile.address.uf ?? "",
        }
      : { ...EMPTY_ADDRESS };
    reset({
      trade_name: profile.trade_name || (organization?.name ?? ""),
      cnpj: maskCnpj(profile.cnpj ?? ""),
      phone: maskPhone(profile.phone ?? ""),
      email: profile.email ?? "",
      legal_name: profile.legal_name ?? "",
      address,
    });
  }, [profile, organization?.name, reset]);

  if (!isLoaded || !organization || membership?.role !== "org:admin") {
    return null;
  }

  const uploadLogo = async (file: File) => {
    setLogoError(null);
    setUploadingLogo(true);
    try {
      await organization.setLogo({ file });
    } catch {
      setLogoError("Não foi possível enviar o logo. Tente novamente.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const submit = handleSubmit(async (values) => {
    setFeedback(null);
    try {
      const name = values.trade_name.trim();
      if (name !== organization.name) {
        await organization.update({ name });
      }
      await updateProfile(orgProfileToInput(values));
      reset(values);
      setFeedback({ ok: true, msg: "Escritório atualizado." });
    } catch {
      setFeedback({ ok: false, msg: "Não foi possível salvar." });
    }
  });

  const cnpj = register("cnpj");
  const phone = register("phone");
  const cep = register("address.cep");

  return (
    <Card className="reveal mt-8 flex flex-col gap-6 p-6">
      <h2 className="text-lg font-medium">Dados do escritório</h2>

      {/* Logo editável — upload imediato (trocar o logo É a ação). */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Editar logo"
          onClick={() => logoRef.current?.click()}
          disabled={uploadingLogo}
          className="group focus-visible:ring-ring/50 relative shrink-0 rounded-2xl outline-none focus-visible:ring-3 disabled:opacity-60"
        >
          <span className="bg-muted ring-border flex size-16 items-center justify-center overflow-hidden rounded-2xl ring-1">
            {organization.hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.imageUrl}
                alt="Logo da organização"
                className="size-full object-cover"
              />
            ) : (
              <Building2 className="text-muted-foreground/60 size-7" />
            )}
          </span>
          <span className="bg-primary text-primary-foreground ring-card absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full shadow-sm ring-2 transition-transform group-hover:scale-110">
            <Pencil className="size-3" />
          </span>
        </button>
        <input
          ref={logoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadLogo(file);
            e.target.value = "";
          }}
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{organization.name}</p>
          <p className="text-muted-foreground text-sm">
            {uploadingLogo
              ? "Enviando logo…"
              : "Aparece para o seu time e nos documentos."}
          </p>
          {logoError ? (
            <p className="text-destructive text-sm" role="alert">
              {logoError}
            </p>
          ) : null}
        </div>
      </div>

      {isProfileLoading ? (
        <p className="text-muted-foreground text-sm">Carregando perfil…</p>
      ) : profileLoadFailed ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível carregar o perfil do escritório. Recarregue a página.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="flex flex-col gap-5 border-t pt-6"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="org_name">Nome do escritório</Label>
            <Input
              id="org_name"
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
              <Label htmlFor="org_cnpj">CNPJ</Label>
              <Input
                id="org_cnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                aria-invalid={errors.cnpj ? true : undefined}
                {...cnpj}
                onChange={(e) => {
                  e.target.value = maskCnpj(e.target.value);
                  void cnpj.onChange(e);
                }}
              />
              {errors.cnpj ? (
                <p className="text-destructive text-sm">
                  {errors.cnpj.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="org_phone">Telefone</Label>
              <Input
                id="org_phone"
                type="tel"
                inputMode="tel"
                placeholder="(11) 3000-0000"
                aria-invalid={errors.phone ? true : undefined}
                {...phone}
                onChange={(e) => {
                  e.target.value = maskPhone(e.target.value);
                  void phone.onChange(e);
                }}
              />
              {errors.phone ? (
                <p className="text-destructive text-sm">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="org_email">E-mail da organização</Label>
            <Input
              id="org_email"
              type="email"
              inputMode="email"
              placeholder="contato@escritorio.com.br"
              aria-invalid={errors.email ? true : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>

          {!addressVisible ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddress(true)}
              >
                <Plus data-icon="inline-start" />
                Adicionar endereço
              </Button>
            </div>
          ) : (
            <fieldset className="flex flex-col gap-5 border-t pt-5">
              <legend className="float-left mb-4 text-sm font-medium">
                Endereço
              </legend>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org_cep">CEP</Label>
                  <Input
                    id="org_cep"
                    inputMode="numeric"
                    placeholder="00000-000"
                    aria-invalid={errors.address?.cep ? true : undefined}
                    {...cep}
                    onChange={(e) => {
                      e.target.value = maskCep(e.target.value);
                      void cep.onChange(e);
                    }}
                  />
                  {errors.address?.cep ? (
                    <p className="text-destructive text-sm">
                      {errors.address.cep.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <div className="flex flex-col gap-2 sm:col-span-3">
                  <Label htmlFor="org_logradouro">Logradouro</Label>
                  <Input
                    id="org_logradouro"
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
                  <Label htmlFor="org_numero">Número</Label>
                  <Input
                    id="org_numero"
                    inputMode="numeric"
                    {...register("address.numero")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org_complemento">Complemento</Label>
                  <Input
                    id="org_complemento"
                    {...register("address.complemento")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org_bairro">Bairro</Label>
                  <Input id="org_bairro" {...register("address.bairro")} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <div className="flex flex-col gap-2 sm:col-span-3">
                  <Label htmlFor="org_cidade">Cidade</Label>
                  <Input
                    id="org_cidade"
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
                  <Label htmlFor="org_uf">UF</Label>
                  <select
                    id="org_uf"
                    aria-invalid={errors.address?.uf ? true : undefined}
                    className={selectClass}
                    defaultValue=""
                    {...register("address.uf")}
                  >
                    <option value="" disabled>
                      UF
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
          )}

          <div className="flex items-center justify-between gap-4">
            {feedback ? (
              <p
                className={
                  feedback.ok
                    ? "text-sm text-emerald-600"
                    : "text-destructive text-sm"
                }
                role={feedback.ok ? "status" : "alert"}
              >
                {feedback.msg}
              </p>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
