import { notFound } from "next/navigation";

import { InAppMockShell } from "@/features/journey-prototype/in-app-state";

export default function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <InAppMockShell>{children}</InAppMockShell>;
}
