import { PreparationWorkspace } from "@/features/curation/components/preparation-workspace";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string }>;
}) {
  const { frame } = await searchParams;
  return (
    <PreparationWorkspace
      frame={typeof frame === "string" ? frame : undefined}
    />
  );
}
