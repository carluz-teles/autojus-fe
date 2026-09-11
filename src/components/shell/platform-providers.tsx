import { ClerkProvider } from "@clerk/nextjs";

import { Providers } from "@/app/providers";
import { clerkAppearance } from "@/lib/clerk-appearance";

/** Platform context stays off public marketing pages. */
export default function PlatformProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <Providers>{children}</Providers>
    </ClerkProvider>
  );
}
