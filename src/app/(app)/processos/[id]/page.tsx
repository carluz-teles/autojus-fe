import { ProcessoCockpit } from "@/features/processos/components/cockpit/processo-cockpit";

// Página do processo (cockpit) — rota dedicada. Shell = Server Component: resolve
// o id da rota e delega para a feature (Client Component), que busca o processo
// por id (GET /v1/processos/:id) e monta o cockpit da Fase 1 (shell sobre o dado
// que já existe, sem IA e sem protocolo). Espelha o deep-link de intimação.
export default async function ProcessoDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProcessoCockpit processoId={id} />;
}
