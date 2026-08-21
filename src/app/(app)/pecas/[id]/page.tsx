import { PecaWorkspace } from "@/features/pecas/components/peca-workspace";

export default async function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PecaWorkspace id={id} />;
}
