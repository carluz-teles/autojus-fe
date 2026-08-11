import { ReconciliationDetail } from "@/features/integrations/components/reconciliation-detail";

// Tela de detalhe de uma importação (guarda-chuva): janelas + collapse de itens.
// Server component fino — resolve o param e entrega ao componente client (React
// Query). Linkada pelos cards da aba Reconciliações.
export default async function ReconciliacaoDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ReconciliationDetail jobId={jobId} />;
}
