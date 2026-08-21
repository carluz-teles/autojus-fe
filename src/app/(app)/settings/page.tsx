import { ConfiguracoesView } from "@/features/configuracoes/components/configuracoes-view";

export const metadata = { title: "Configurações · jus·assessoria" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <ConfiguracoesView inicial={tab} />;
}
