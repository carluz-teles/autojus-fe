import { IntimacaoDetalhe } from "@/features/prazos/components/intimacao-detalhe/intimacao-detalhe";

export const metadata = { title: "Intimação · Prazos · jus·assessoria" };

// Next.js 16: params é assíncrono (Promise).
export default async function IntimacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntimacaoDetalhe id={id} />;
}
