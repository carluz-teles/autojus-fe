import { ClosedTestPage } from "@/features/curation/components/closed-test-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClosedTestPage key={id} id={id} />;
}
