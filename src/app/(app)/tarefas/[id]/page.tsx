import { TarefaDetalhePage } from "@/features/tasks/components/tarefa-detalhe-page";

// Rota de detalhe da tarefa (deep-link). Shell = Server Component: resolve o id da
// rota e delega para a feature (Client Component), que busca a tarefa por id
// (GET /v1/tasks/:id) e abre para QUALQUER tarefa. Espelha as rotas de intimação/prazo.
export default async function TarefaDetalheRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TarefaDetalhePage id={id} />;
}
