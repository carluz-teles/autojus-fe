import { notFound } from "next/navigation";

import { InAppMockScreen } from "@/features/journey-prototype/in-app-screen";

export const metadata = { title: "Atjus · Simulação do fluxo" };

export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen = ["triagem"] } = await params;
  return <InAppMockScreen key={screen.join("/")} screen={screen} />;
}
