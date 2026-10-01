"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AssistentePanel } from "@/features/pecas-v2/components/construction/assistente-panel";

import { setFeedbackIdentity } from "./feedback-auth";

export default function FeedbackBrowserPage() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    setFeedbackIdentity("person-a", "org-a");
    return () => client.clear();
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <main className="bg-background mx-auto flex h-svh max-w-3xl flex-col">
        <header className="flex flex-wrap gap-3 border-b p-4">
          <h1 className="font-display text-xl">Chat · QA sintético</h1>
          <button onClick={() => setFeedbackIdentity("person-b", "org-a")}>
            Trocar pessoa (QA)
          </button>
          <button onClick={() => setFeedbackIdentity("person-a", "org-b")}>
            Trocar escritório (QA)
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <AssistentePanel
            draftId="synthetic-draft"
            contentRevision="synthetic-revision"
            applyToEditor={() => false}
            onSource={() => undefined}
          />
        </div>
      </main>
    </QueryClientProvider>
  );
}
