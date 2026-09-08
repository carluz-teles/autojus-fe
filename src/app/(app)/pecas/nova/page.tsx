import { redirect } from "next/navigation";

import { ConstructionEntry } from "@/features/pecas-v2/components/pregen/construction-entry";

export const metadata = { title: "Nova peça · Construção · jus·assessoria" };

// Both routes resolve the intimation and open the construction directly.
export default async function NovaPecaPage({
  searchParams,
}: {
  searchParams: Promise<{ intimacao?: string; providencia?: string }>;
}) {
  const { intimacao, providencia } = await searchParams;
  if (providencia)
    return <ConstructionEntry key={providencia} actionItemId={providencia} />;
  if (!intimacao) redirect("/intimacoes");
  return <ConstructionEntry key={intimacao} intimationId={intimacao} />;
}
