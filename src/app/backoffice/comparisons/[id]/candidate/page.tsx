import { CandidateSelection } from "@/features/curation/components/candidate-selection";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CandidateSelection key={id} id={id} />;
}
