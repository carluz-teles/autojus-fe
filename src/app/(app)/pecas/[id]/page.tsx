import { PecaWorkspace } from "@/features/prazos/components/peca/peca-workspace";

export const metadata = { title: "Peça · Construção · jus·assessoria" };

// Next.js 16: params é assíncrono (Promise).
export default async function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PecaWorkspace id={id} />;
}
