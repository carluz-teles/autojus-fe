import { UserProfile } from "@clerk/nextjs";

import { PageHeader } from "@/components/shell/page-header";

// Optional catch-all ([[...rest]]) — o Clerk gerencia as sub-rotas internas do perfil.
export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" description="Sua conta e preferências." />
      <div className="reveal mt-8">
        <UserProfile
          routing="path"
          path="/profile"
          appearance={{
            elements: { rootBox: "w-full", cardBox: "w-full shadow-sm" },
          }}
        />
      </div>
    </>
  );
}
