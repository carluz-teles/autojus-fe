import { EvaluationDetail } from "@/features/curation/components/evaluation-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EvaluationDetail key={id} id={id} />;
}
