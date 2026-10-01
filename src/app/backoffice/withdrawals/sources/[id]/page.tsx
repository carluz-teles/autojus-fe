import { WithdrawalPage } from "@/features/curation/components/withdrawal-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WithdrawalPage key={id} scope="source" target={id} />;
}
