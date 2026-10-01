import { ComparisonWorkspace } from "@/features/curation/components/comparison-workspace";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComparisonWorkspace key={id} id={id} />;
}
