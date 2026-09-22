import { Suspense } from "react";

import { SkeletonDetail } from "@/components/ui/skeletons";
import { ProcessosLista } from "@/features/prazos/components/acervo/processos-lista";

export const metadata = { title: "Processos · Acervo · jus·assessoria" };

export default function AcervoProcessosPage() {
  return (
    <Suspense fallback={<SkeletonDetail />}>{<ProcessosLista />}</Suspense>
  );
}
