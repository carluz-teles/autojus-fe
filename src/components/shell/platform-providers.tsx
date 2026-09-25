import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/app/providers";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { APP_HOME_PATH, ONBOARDING_PATH } from "@/lib/routes";

/** Platform context stays off public marketing pages. */
export default function PlatformProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl={APP_HOME_PATH}
      signUpFallbackRedirectUrl={ONBOARDING_PATH}
    >
      <Providers>{children}</Providers>
    </ClerkProvider>
  );
}
