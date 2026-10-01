import { DecisionHistoryPage } from "@/features/curation/components/decision-receipt";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DecisionHistoryPage key={id} id={id} />;
}
