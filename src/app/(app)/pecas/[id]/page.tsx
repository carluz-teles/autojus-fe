import { PecaDetalhe } from "@/features/pecas/components/peca-detalhe";

// Rota de detalhe da peça (deep-link /pecas/[id]). Shell = Server Component:
// resolve o id da rota e delega para a feature (Client Component). CASCA fiel ao
// design LEXIA — o backend de Peças é FASE 4 e ainda não existe, então os campos
// são placeholder "Fase 4" e as ações ficam desabilitadas.
export default async function PecaDetalheRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PecaDetalhe id={id} />;
}
