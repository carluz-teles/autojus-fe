import { CandidateDetail } from "@/features/curation/components/candidate-record";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CandidateDetail key={id} id={id} />;
}
