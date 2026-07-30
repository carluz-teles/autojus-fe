import { OrganizationProfile } from "@clerk/nextjs";

import { PageHeader } from "@/components/shell/page-header";

// Org = tenant. Optional catch-all ([[...rest]]) — o Clerk gerencia membros,
// convites e configurações do escritório internamente.
export default function OrganizationPage() {
  return (
    <>
      <PageHeader
        title="Organização"
        description="Dados do escritório, membros e convites."
      />
      <div className="reveal mt-8">
        <OrganizationProfile
          routing="path"
          path="/organization"
          appearance={{
            elements: { rootBox: "w-full", cardBox: "w-full shadow-sm" },
          }}
        />
      </div>
    </>
  );
}
