import { AnnotationWorkspace } from "@/features/curation/components/annotation-workspace";

export default async function AnnotationWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const { batch } = await searchParams;
  return (
    <AnnotationWorkspace
      batch={typeof batch === "string" ? batch : undefined}
    />
  );
}
