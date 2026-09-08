import type { IntimacaoRecipient } from "@/features/intimacoes/types";
import type { PartesView } from "@/features/processos/types";

export interface RepresentedParty {
  name: string;
  role: string;
}
const oabKey = (number: string, uf: string) => {
  const digits = number.replace(/\D/g, "").replace(/^0+/, "");
  return digits && uf.trim() ? `${uf.trim().toUpperCase()}:${digits}` : "";
};

export function partyOptions(parties?: PartesView): RepresentedParty[] {
  if (!parties) return [];
  return [
    ...parties.autor.map((p) => ({ name: p.name, role: "Autor / Exequente" })),
    ...parties.reu.map((p) => ({ name: p.name, role: "Réu / Executado" })),
    ...parties.terceiros.map((p) => ({ name: p.name, role: "Terceiro" })),
  ];
}

/** Only a unique party linked to a monitored counsel is safe to prefill.
 * Publication recipients themselves are lawyers, never represented parties. */
export function representedParty(
  parties?: PartesView,
  recipients: IntimacaoRecipient[] = [],
): RepresentedParty | null {
  if (!parties) return null;
  const monitored = new Set(
    recipients
      .filter((r) => r.matched)
      .map((r) => oabKey(r.oab_number, r.oab_uf))
      .filter(Boolean),
  );
  const groups = [
    ...parties.autor.map((p) => ({ ...p, role: "Autor / Exequente" })),
    ...parties.reu.map((p) => ({ ...p, role: "Réu / Executado" })),
    ...parties.terceiros.map((p) => ({ ...p, role: "Terceiro" })),
  ];
  const candidates = groups.filter((p) =>
    p.counsels.some((c) => monitored.has(oabKey(c.oab, c.uf))),
  );
  return candidates.length === 1
    ? { name: candidates[0].name, role: candidates[0].role }
    : null;
}
