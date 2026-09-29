import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { OrganizationCoordinator } from "@/components/shell/organization-coordinator";
import PlatformProviders from "@/components/shell/platform-providers";

// O coordinator só monta o shell depois de confirmar o tenant do token ativo.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <PlatformProviders>
      <OrganizationCoordinator mode="app">
        <AppShell>{children}</AppShell>
      </OrganizationCoordinator>
    </PlatformProviders>
  );
}
