import { GoldRevisionPage } from "@/features/curation/components/gold-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoldRevisionPage key={id} id={id} />;
}
