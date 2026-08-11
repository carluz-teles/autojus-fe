import { redirect } from "next/navigation";

// O detalhe do processo virou um drawer sobre a lista. Esta rota legada só
// preserva links antigos: redireciona para a lista com ?id=, que reabre o
// drawer quando o item está nas páginas carregadas. A tela dedicada de
// processo (linha do tempo, responsáveis, documentos) vem numa fatia futura.
export default async function ProcessoDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/processos?id=${encodeURIComponent(id)}`);
}
