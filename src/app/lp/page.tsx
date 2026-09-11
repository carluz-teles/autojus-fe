import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/components/landing-page";
import { getLandingSite } from "@/features/landing/seo";

const site = getLandingSite();

export const metadata: Metadata = {
  metadataBase: site.origin ? new URL(site.origin) : undefined,
  alternates: site.canonical ? { canonical: site.canonical } : undefined,
  robots: { index: site.indexable, follow: site.indexable },
  icons: { icon: "/atjud-mark.svg" },
  title: "AtJud — Acervo conectado, providências automáticas e minutas com IA",
  description:
    "Centralize processos e autos, receba providências automáticas e gere minutas fundamentadas. Resuma documentos e refine sua redação no chat jurídico com fontes.",
  openGraph: {
    title: "A intimação chega. O próximo passo, também. | AtJud",
    description:
      "Processos, autos e publicações em um só lugar. Providências automáticas, minutas inteligentes e um assistente que conversa com o contexto do seu caso.",
    locale: "pt_BR",
    type: "website",
    siteName: "AtJud",
    url: site.canonical ?? undefined,
  },
  twitter: { card: "summary" },
};

export default function Page() {
  return <LandingPage />;
}
