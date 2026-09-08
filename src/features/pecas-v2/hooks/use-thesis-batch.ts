"use client";

import { useState } from "react";

import {
  type SelectionOverrides,
  thesisSelection,
  toggleThesisSelection,
} from "../lib/thesis-selection";
import type { Thesis } from "../types";

export function useThesisBatch(theses: Thesis[]) {
  const [overrides, setOverrides] = useState<SelectionOverrides>({});
  return {
    ...thesisSelection(theses, overrides),
    toggle: (thesis: Thesis) =>
      setOverrides((current) => toggleThesisSelection(thesis, current)),
    selectAll: (selected: boolean) =>
      setOverrides(Object.fromEntries(theses.map((t) => [t.id, selected]))),
    reset: () => setOverrides({}),
  };
}
