import { PageHeader } from "@/components/shell/page-header";
import { MembersPanel } from "@/features/organization/components/members-panel";
import { OrgSettings } from "@/features/organization/components/org-settings";

// Org = tenant. Tela headless (nossa UI) que substitui o <OrganizationProfile/> do
// Clerk: dados do escritório + membros + convites via useOrganization, com o nosso
// design. OrgSettings some para não-admins (só admin edita o escritório).
export default function OrganizationPage() {
  return (
    <>
      <PageHeader
        title="Organização"
        description="Escritório, membros e convites."
      />
      <OrgSettings />
      <MembersPanel />
    </>
  );
}
