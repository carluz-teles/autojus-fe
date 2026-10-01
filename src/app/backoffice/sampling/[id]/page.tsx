import { SamplingFramePanel } from "@/features/curation/components/sampling-frame";

export default async function SamplingFramePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SamplingFramePanel key={id} id={id} />;
}
