import { ConstructionPage } from "@/features/pecas-v2/components/construction/construction-page";

export const metadata = { title: "Peça · Construção · jus·assessoria" };

// Next.js 16: params é assíncrono (Promise).
export default async function PecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConstructionPage id={id} />;
}
