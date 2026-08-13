import { IntimacaoDetailPage } from "@/features/intimacoes/components/intimacao-detail-page";

// Rota de detalhe da intimação (deep-link próprio). Shell = Server Component:
// resolve o id da rota e delega para a feature (Client Component), que busca a
// intimação por id (GET /v1/intimacoes/:id) e abre para QUALQUER intimação —
// esteja ela nas páginas carregadas da lista ou não.
export default async function IntimacaoDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntimacaoDetailPage id={id} />;
}
