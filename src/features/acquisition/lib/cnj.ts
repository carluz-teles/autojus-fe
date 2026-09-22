import { z } from "zod";

// Máscara progressiva do número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO), aplicada enquanto
// o usuário digita. Puro — sem React. Aceita colar com ou sem separadores; corta em
// 20 dígitos. O dígito verificador e o tribunal são validados no backend.
export function maskCnj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 20);
  let out = d.slice(0, 7);
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  if (d.length > 9) out += `.${d.slice(9, 13)}`;
  if (d.length > 13) out += `.${d.slice(13, 14)}`;
  if (d.length > 14) out += `.${d.slice(14, 16)}`;
  if (d.length > 16) out += `.${d.slice(16, 20)}`;
  return out;
}

/** Só os dígitos (o BE também aceita 20 dígitos crus). */
export function cnjDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Schema do form de importação por CNJ. O cliente só garante que o número está
// completo (20 dígitos); o dígito verificador e o tribunal são validados no
// servidor — a mensagem de erro abaixo do campo é a barreira de UX.
export const importCnjSchema = z.object({
  cnj: z
    .string()
    .refine(
      (value) => cnjDigits(value).length === 20,
      "Informe o número CNJ completo (20 dígitos).",
    ),
});

export type ImportCnjForm = z.infer<typeof importCnjSchema>;
