// Schema e mapeamento do PERFIL FISCAL do escritório — fonte única usada pelo
// onboarding (passo Sua empresa) e pela página /organization (edição). Mensagens
// vêm de fora (cada feature injeta as suas), a regra é uma só: CNPJ obrigatório,
// com máscara no input (dígitos puros persistidos), mas sem checagem de que tem
// exatamente 14 dígitos — o campo não bloqueia o submit por formato incompleto.
// Telefone 10-11 quando presente, e-mail válido quando presente. Localização do
// escritório = só CIDADE + UF (endereço postal não é usado pelo produto; rua/CEP
// deixaram de ser coletados). Vazio como um todo passa; qualquer campo preenchido
// exige cidade+uf — espelho do BE, que agora só exige cidade/uf.

import { z } from "zod";

import type { Address, OrgProfileInput } from "@/features/onboarding/types";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const EMPTY_ADDRESS = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export interface OrgProfileMessages {
  nameRequired: string;
  cnpjRequired: string;
  phoneInvalid: string;
  emailInvalid: string;
  cidadeRequired: string;
  ufInvalid: string;
}

export function makeOrgProfileSchema(m: OrgProfileMessages) {
  // Rua/CEP/número/complemento/bairro seguem no shape (o que já existe no banco
  // sobrevive ao round-trip), mas não são mais validados nem coletados. Só
  // cidade+uf importam: vazios como um todo passam; um preenchido exige o outro.
  const addressSchema = z
    .object({
      cep: z.string(),
      logradouro: z.string(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string(),
      uf: z.string(),
    })
    .superRefine((a, ctx) => {
      const filled = a.cidade.trim() !== "" || a.uf.trim() !== "";
      if (!filled) return;
      if (!a.cidade.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cidade"],
          message: m.cidadeRequired,
        });
      }
      if (a.uf.trim().length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uf"],
          message: m.ufInvalid,
        });
      }
    });

  return z.object({
    trade_name: z.string().trim().min(1, m.nameRequired),
    cnpj: z.string().trim().min(1, m.cnpjRequired),
    phone: z
      .string()
      .refine((v) => {
        const d = onlyDigits(v);
        return d.length === 0 || d.length === 10 || d.length === 11;
      }, m.phoneInvalid)
      .optional(),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.string().email().safeParse(v).success, {
        message: m.emailInvalid,
      })
      .optional(),
    // Razão social sem UI: preenchida por lookup/leitura; fallback = nome.
    legal_name: z.string().optional(),
    address: addressSchema,
  });
}

export type OrgProfileFormValues = z.infer<
  ReturnType<typeof makeOrgProfileSchema>
>;

/** Mapeia os valores do form pro payload do PUT (dígitos puros; endereço só quando tocado). */
export function orgProfileToInput(
  values: OrgProfileFormValues,
): OrgProfileInput {
  const addressTouched = Object.values(values.address).some(
    (v) => (v ?? "").trim() !== "",
  );
  const address: Address | undefined = addressTouched
    ? {
        cep: onlyDigits(values.address.cep),
        logradouro: values.address.logradouro.trim(),
        numero: values.address.numero?.trim() || undefined,
        complemento: values.address.complemento?.trim() || undefined,
        bairro: values.address.bairro?.trim() || undefined,
        cidade: values.address.cidade.trim(),
        uf: values.address.uf.trim().toUpperCase(),
      }
    : undefined;

  return {
    cnpj: onlyDigits(values.cnpj),
    phone: onlyDigits(values.phone ?? "") || undefined,
    email: values.email?.trim() || undefined,
    legal_name: values.legal_name?.trim() || values.trade_name.trim(),
    trade_name: values.trade_name.trim(),
    address,
  };
}
