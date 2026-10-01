"use client";

import { useState } from "react";

import { AiFeedback } from "@/features/ai-feedback/components/ai-feedback";

import type { BriefSummaryResult } from "../services/brief-summary-result";

export function BriefSummaryFeedback({
  result,
}: {
  result: BriefSummaryResult | null;
}) {
  return result ? <SummaryDisclosure key={result.id} result={result} /> : null;
}

function SummaryDisclosure({ result }: { result: BriefSummaryResult }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="mt-2" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="text-muted-foreground focus-visible:ring-ring w-fit cursor-pointer rounded text-xs outline-none focus-visible:ring-2">
        Avaliar resumo
      </summary>
      {open ? (
        <div className="mt-2 space-y-3">
          <p className="text-foreground text-sm wrap-anywhere whitespace-pre-wrap">
            {result.text}
          </p>
          <AiFeedback resultId={result.id} question="Este resumo foi útil?" />
        </div>
      ) : null}
    </details>
  );
}
