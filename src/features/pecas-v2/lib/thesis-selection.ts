import type { Thesis, ThesisState } from "../types";

export function isSelectedForGeneration(state: ThesisState): boolean {
  return state === "included" || state === "pending_add";
}

export type SelectionOverrides = Record<string, boolean>;

/** Only explicit choices override the latest list; newly loaded sources stay intact. */
export function thesisSelection(
  theses: Thesis[],
  overrides: SelectionOverrides,
) {
  const ids: string[] = [];
  let added = 0;
  let removed = 0;
  for (const thesis of theses) {
    const current = isSelectedForGeneration(thesis.state);
    const selected = overrides[thesis.id] ?? current;
    if (selected) ids.push(thesis.id);
    if (selected && !current) added++;
    if (!selected && current) removed++;
  }
  return { ids, added, removed, changeCount: added + removed };
}

export function toggleThesisSelection(
  thesis: Thesis,
  overrides: SelectionOverrides,
): SelectionOverrides {
  const current = isSelectedForGeneration(thesis.state);
  const selected = !(overrides[thesis.id] ?? current);
  const next = { ...overrides };
  if (selected === current) delete next[thesis.id];
  else next[thesis.id] = selected;
  return next;
}
