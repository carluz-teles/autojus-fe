import { ProcessoCockpit } from "@/features/processos/components/processo-cockpit";

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  return <ProcessoCockpit numero={decodeURIComponent(numero)} />;
}
