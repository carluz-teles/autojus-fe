import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export default function OrganizationPage() {
  return (
    <>
      <PageHeader
        title="Organização"
        description="Dados do escritório e membros (tenant = organização Clerk)."
      />
      <ComingSoon note="OrganizationProfile (Clerk) chega na FE-3." />
    </>
  );
}
