import { redirect } from "next/navigation";

import { PartidaPage } from "@/features/pecas-v2/components/pregen/partida-page";

export const metadata = { title: "Nova peça · Construção · jus·assessoria" };

// PARTIDA (/pecas/nova?intimacao=<id>): a Construção ANTES da peça existir. A peça
// só é criada no "Gerar minuta". Sem intimação na query não há o que construir →
// volta pros prazos. Next.js 16: searchParams é assíncrono (Promise).
export default async function NovaPecaPage({
  searchParams,
}: {
  searchParams: Promise<{ intimacao?: string }>;
}) {
  const { intimacao } = await searchParams;
  if (!intimacao) redirect("/prazos");
  return <PartidaPage intimacaoId={intimacao} />;
}
