import { ComparisonDetail } from "@/features/curation/components/comparison-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonDetail key={id} id={id} />;
}
