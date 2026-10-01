import { PreparedBatchPage } from "@/features/curation/components/prepared-batch";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PreparedBatchPage key={id} id={id} />;
}
