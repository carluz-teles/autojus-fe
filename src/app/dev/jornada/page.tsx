import { notFound } from "next/navigation";

import { JourneyPrototype } from "@/features/journey-prototype/journey-prototype";

export const metadata = { title: "Jornada contínua · Protótipo Atjus" };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <JourneyPrototype />;
}
