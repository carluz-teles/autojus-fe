import { DecisionPage } from "@/features/curation/components/decision-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DecisionPage key={id} task={id} />;
}
