import { ReleasePreparation } from "@/features/curation/components/release-preparation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReleasePreparation key={id} batch={id} />;
}
