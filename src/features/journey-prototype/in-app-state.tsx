"use client";

import { createContext, useContext, useState } from "react";

import { ShellContent } from "@/components/shell/shell-content";
import { PreviewSidebar } from "@/components/shell/sidebar";

import { type DemoJourney } from "./demo-data";
import { concludeDemoAnalysis } from "./mock-transition";
import { createTriageDemo } from "./triage-data";

const Context = createContext<{
  journeys: DemoJourney[];
  concludeAnalysis: (ids?: string[]) => void;
} | null>(null);

export function InAppMockShell({ children }: { children: React.ReactNode }) {
  const [journeys, setJourneys] = useState(createTriageDemo);
  return (
    <Context.Provider
      value={{
        journeys,
        concludeAnalysis: (ids) =>
          setJourneys((current) => concludeDemoAnalysis(current, ids)),
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <PreviewSidebar
          triagemCount={journeys.filter((item) => !item.works.length).length}
        />
        <ShellContent>{children}</ShellContent>
      </div>
    </Context.Provider>
  );
}

export function useInAppMock() {
  const context = useContext(Context);
  if (!context) throw new Error("Mock screen requires InAppMockShell");
  return context;
}
