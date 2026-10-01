import { ProtocolEditorPage } from "@/features/curation/components/protocol-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ previous?: string }>;
}) {
  const { previous } = await searchParams;
  return (
    <ProtocolEditorPage
      previousID={typeof previous === "string" ? previous : undefined}
    />
  );
}
