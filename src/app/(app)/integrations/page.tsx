import { PageHeader } from "@/components/shell/page-header";
import { IntegrationsPanel } from "@/features/integrations/components/integrations-panel";

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrações"
        description="Fontes de dados (tribunais e diários) e as OABs que você monitora."
      />
      <IntegrationsPanel />
    </>
  );
}
