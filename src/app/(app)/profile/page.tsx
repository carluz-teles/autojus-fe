import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" description="Sua conta e preferências." />
      <ComingSoon note="UserProfile (Clerk) chega na FE-3." />
    </>
  );
}
