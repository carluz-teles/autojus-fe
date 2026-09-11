import { notFound } from "next/navigation";

import { PreparationPrototype } from "@/features/pecas-v2/components/pregen/preparation-prototype";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreparationPrototype />;
}
