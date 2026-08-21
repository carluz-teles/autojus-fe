import { IntimacaoDetail } from "@/features/intimacoes/components/intimacao-detail";

// Rota de detalhe da intimação (deep-link próprio). Shell = Server Component:
// resolve o id da rota e delega para a feature (Client Component, dado mockado).
export default async function IntimacaoDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntimacaoDetail id={id} />;
}
