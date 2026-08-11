import { redirect } from "next/navigation";

// O detalhe da intimação virou um drawer sobre a lista. Esta rota legada só
// preserva links antigos: redireciona para a lista com ?id=, que reabre o
// drawer quando o item está nas páginas carregadas.
export default async function IntimacaoDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/intimacoes?id=${encodeURIComponent(id)}`);
}
