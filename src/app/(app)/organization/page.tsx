import { PageHeader } from "@/components/shell/page-header";
import { MembersPanel } from "@/features/organization/components/members-panel";

// Org = tenant. Tela headless (nossa UI) que substitui o <OrganizationProfile/> do
// Clerk: membros + convites via useOrganization, estilizados com o nosso design.
export default function OrganizationPage() {
  return (
    <>
      <PageHeader
        title="Organização"
        description="Membros e convites do escritório."
      />
      <MembersPanel />
    </>
  );
}
