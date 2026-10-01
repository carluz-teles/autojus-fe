import { FeedbackQueueScopePage } from "@/features/curation/components/feedback-queues";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeedbackQueueScopePage id={id} />;
}
