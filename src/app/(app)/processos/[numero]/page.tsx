import { ProcessoHub } from "@/features/prazos/components/processo/processo-hub";

export const metadata = { title: "Processo · Prazos · jus·assessoria" };

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  return <ProcessoHub numero={decodeURIComponent(numero)} />;
}
