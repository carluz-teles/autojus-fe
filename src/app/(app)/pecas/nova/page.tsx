import { redirect } from "next/navigation";

import { ConstructionEntry } from "@/features/pecas-v2/components/pregen/construction-entry";

export const metadata = { title: "Nova peça · Construção · jus·assessoria" };

// Both routes resolve the intimation and open the construction directly.
export default async function NovaPecaPage({
  searchParams,
}: {
  searchParams: Promise<{
    intimacao?: string;
    providencia?: string;
    verificar_providencia?: string;
    auto?: string;
  }>;
}) {
  const { intimacao, providencia, verificar_providencia, auto } =
    await searchParams;
  // auto=1 → auto-partida: construção direto (tela "Construindo a peça…"),
  // pulando a escolha de teses.
  const autoStart = auto === "1" || auto === "true";
  if (providencia)
    return (
      <ConstructionEntry
        key={providencia}
        actionItemId={providencia}
        auto={autoStart}
      />
    );
  if (!intimacao) redirect("/intimacoes");
  return (
    <ConstructionEntry
      key={intimacao}
      intimationId={intimacao}
      existingActionItemId={verificar_providencia}
      auto={autoStart}
    />
  );
}
