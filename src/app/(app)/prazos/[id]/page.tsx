import { PrazoDetalhePage } from "@/features/prazos/components/prazo-detalhe-page";

// Rota de detalhe do prazo (deep-link). Shell = Server Component: resolve o id da
// rota e delega para a feature (Client Component), que busca o prazo por id
// (GET /v1/prazos/:id) e abre para QUALQUER prazo. Espelha a rota da intimação.
export default async function PrazoDetalheRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrazoDetalhePage id={id} />;
}
