import { Suspense } from "react";

import { SkeletonDetail } from "@/components/ui/skeletons";
import { TriagemView } from "@/features/triagem/components/triagem-view";

export const metadata = { title: "Triagem · jus·assessoria" };

export default function TriagemPage() {
  return (
    <Suspense fallback={<SkeletonDetail />}>
      {" "}
      <TriagemView />{" "}
    </Suspense>
  );
}
