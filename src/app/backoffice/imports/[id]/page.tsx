import { ImportBatchPanel } from "@/features/curation/components/import-batch-panel";

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ImportBatchPanel key={id} id={id} />;
}
