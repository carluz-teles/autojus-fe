import type { ImportContext } from "./imports";

export const commercialContextFields = [
  { name: "document_type", label: "Tipo de documento na origem" },
  { name: "communication_kind", label: "Tipo de comunicação na origem" },
  { name: "intimation_type", label: "Tipo de intimação na origem" },
  { name: "declared_deadline", label: "Prazo declarado na origem" },
] as const;

export const importContextLabels: Record<string, string> = {
  court: "Tribunal",
  procedure: "Procedimento",
  channel: "Canal",
  legal_date: "Data jurídica",
  publication_date: "Publicação",
  recipient_role: "Destinatário informado",
  notes: "Notas",
  ...Object.fromEntries(
    commercialContextFields.map((field) => [
      `commercial_type.${field.name}`,
      field.label,
    ]),
  ),
};

export function importContextEntries(
  context: ImportContext,
): [string, string | null][] {
  const { commercial_type: commercial, ...base } = context;
  const entries: [string, string | null][] = Object.entries(base);
  if (commercial == null) return entries;
  for (const field of commercialContextFields) {
    const value = commercial[field.name];
    entries.push([
      `commercial_type.${field.name}`,
      value == null
        ? "Não capturado"
        : value === ""
          ? "Capturado vazio"
          : typeof value === "string"
            ? value
            : "Campo inválido na origem",
    ]);
  }
  return entries;
}
