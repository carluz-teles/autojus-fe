import { TarefaDetail } from "@/features/tasks/components/tarefa-detail";

export default async function TarefaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TarefaDetail id={id} />;
}
