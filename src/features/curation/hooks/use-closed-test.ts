"use client";
import { useAnnotationNavigation } from "./_private/use-annotation-navigation";
import { useClosedTestActions } from "./_private/use-closed-test-actions";
import { useClosedTestEditor } from "./_private/use-closed-test-editor";
import { useClosedTestQueries } from "./_private/use-closed-test-queries";
import { useEvaluationAccess } from "./use-evaluations";

export function useClosedTest(id: string) {
  const allowed = useEvaluationAccess();
  const queries = useClosedTestQueries(id, allowed);
  const actions = useClosedTestActions(queries, allowed);
  const editor = useClosedTestEditor(queries, actions);
  const navigation = useAnnotationNavigation(
    actions.write.uncertain ||
      actions.write.mutation.isPending ||
      (editor.form.formState.isDirty && !queries.reservation.data) ||
      Object.values(actions.confirmation).some(Boolean),
  );
  return { allowed, queries, actions, editor, navigation };
}
