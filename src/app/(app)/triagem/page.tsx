import { Suspense } from "react";

import { SkeletonDetail } from "@/components/ui/skeletons";
import { TriagemView } from "@/features/triagem/components/triagem-view";

export const metadata = { title: "Mesa de Trabalho · jus·assessoria" };

export default function TriagemPage() {
  return (
    <Suspense fallback={<SkeletonDetail />}>
      {" "}
      <TriagemView />{" "}
    </Suspense>
  );
}
