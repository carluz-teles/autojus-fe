import { ImportReview } from "@/features/curation/components/import-review";

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  return <ImportReview batchId={id} itemId={itemId} />;
}
