import { PageHeader } from "@/components/shell/page-header";
import { ProfilePanel } from "@/features/profile/components/profile-panel";

// Conta do usuário. Tela headless (nossa UI) que substitui o <UserProfile/> do
// Clerk: dados pessoais + segurança via useUser, estilizados com o nosso design.
export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Perfil"
        description="Seus dados e segurança da conta."
      />
      <ProfilePanel />
    </>
  );
}
