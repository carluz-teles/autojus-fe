import { AnnotationPage } from "@/features/curation/components/annotation-page";

export default async function AnnotationAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recover?: string }>;
}) {
  const [{ id }, { recover }] = await Promise.all([params, searchParams]);
  return (
    <AnnotationPage
      key={id}
      id={id}
      recoverFrom={typeof recover === "string" ? recover : undefined}
    />
  );
}
