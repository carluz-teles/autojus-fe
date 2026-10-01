import { FeedbackMetricsPage } from "@/features/curation/components/feedback-metrics";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackMetricsPage key={id} id={id} />;
}
