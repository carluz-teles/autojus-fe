import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/app/providers";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { APP_HOME_PATH } from "@/lib/routes";

/** Platform context stays off public marketing pages. */
export default function PlatformProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInFallbackRedirectUrl={APP_HOME_PATH}
      signUpFallbackRedirectUrl={APP_HOME_PATH}
    >
      <Providers>{children}</Providers>
    </ClerkProvider>
  );
}
