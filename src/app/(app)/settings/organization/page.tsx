import { MembersPanel } from "@/features/organization/components/members-panel";
import { OrgSettings } from "@/features/organization/components/org-settings";

// Seção Organização: dados do escritório + membros e convites (headless).
// OrgSettings some para não-admins (só admin edita o escritório).
export default function SettingsOrganizationPage() {
  return (
    <>
      <OrgSettings />
      <MembersPanel />
    </>
  );
}
