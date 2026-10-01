import { ProtocolDetailPage } from "@/features/curation/components/protocol-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProtocolDetailPage key={id} id={id} />;
}
