import { notFound } from "next/navigation";

import PlatformProviders from "@/components/shell/platform-providers";

// Playground de protótipos/mockups: fora do gate de auth (liberado no proxy)
// pra facilitar iteração de design, e inexistente em produção — o guard aqui
// cobre também as páginas que não fazem o próprio notFound().
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <PlatformProviders>{children}</PlatformProviders>;
}
