import { Suspense } from "react";

import { SkeletonDetail } from "@/components/ui/skeletons";
import { ProcessoHub } from "@/features/prazos/components/processo/processo-hub";

export const metadata = { title: "Processo · Prazos · jus·assessoria" };

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  return (
    <Suspense fallback={<SkeletonDetail />}>
      {<ProcessoHub numero={decodeURIComponent(numero)} />}
    </Suspense>
  );
}
