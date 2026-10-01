"use client";

// Copied ONLY into the runner's disposable app. Never imported by a product
// route. This browser check exercises the UI with an explicit synthetic session;
// real authorization is verified separately in backend and boundary tests.
import { QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";

import { usePrivateQueryClient } from "@/features/curation/hooks/_private/use-private-query-client";
import { BackofficeContext } from "@/features/curation/hooks/use-backoffice-context";

export default function CurationBrowserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = usePrivateQueryClient();
  return (
    <QueryClientProvider client={client}>
      <BackofficeContext.Provider
        value={{
          organization_id: "org_synthetic",
          tenant_id: "synthetic-tenant",
          user_id: "synthetic-person",
          revision: 1,
          capabilities: [
            "curation.read",
            "curation.admit",
            "curation.annotate",
            "curation.decide",
            "curation.manage",
            "curation.predict",
            "curation.publish",
          ],
          requires_organization_switch: false,
        }}
      >
        <div className="bg-background min-h-svh">
          <header className="border-b px-6 py-5">
            <Link href="/backoffice/curation" className="font-display text-xl">
              AtJud · Curadoria
            </Link>
            <span className="ml-4 text-sm">QA sintético</span>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </BackofficeContext.Provider>
    </QueryClientProvider>
  );
}
