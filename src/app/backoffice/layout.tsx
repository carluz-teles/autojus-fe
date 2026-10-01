import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import PlatformProviders from "@/components/shell/platform-providers";
import { BackofficeBoundary } from "@/features/curation/components/backoffice-boundary";

// Independent of the commercial shell: no onboarding, trial or billing queries.
// Current membership and capability are also checked by every backend operation.
export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Fbackoffice");
  return (
    <PlatformProviders>
      <BackofficeBoundary>{children}</BackofficeBoundary>
    </PlatformProviders>
  );
}
