import { ProvidenciaDetail } from "@/features/action-items/components/providencia-detail";

export const metadata = { title: "Providência · jus·assessoria" };

// Next.js 16: params é assíncrono (Promise).
export default async function ProvidenciaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProvidenciaDetail id={id} />;
}
