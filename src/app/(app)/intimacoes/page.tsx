import { Suspense } from "react";

import { SkeletonDetail } from "@/components/ui/skeletons";
import { IntimacoesFeed } from "@/features/prazos/components/acervo/intimacoes-feed";

export const metadata = { title: "Intimações · Feed · jus·assessoria" };

export default function AcervoIntimacoesPage() {
  return (
    <Suspense fallback={<SkeletonDetail />}>
      {" "}
      <IntimacoesFeed />{" "}
    </Suspense>
  );
}
