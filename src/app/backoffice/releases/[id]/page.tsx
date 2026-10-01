import { ReleaseDetail } from "@/features/curation/components/release-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReleaseDetail key={id} id={id} />;
}
