import { GoldPreviewPage } from "@/features/curation/components/gold-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoldPreviewPage key={id} id={id} />;
}
