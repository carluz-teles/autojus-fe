import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrações"
        description="Fontes de dados (tribunais, diários) e credenciais."
      />
      <ComingSoon note="Consome /v1/acquisition/integrations do backend na FE-3." />
    </>
  );
}
