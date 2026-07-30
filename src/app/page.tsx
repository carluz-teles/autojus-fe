import { redirect } from "next/navigation";

export default function Home() {
  // Raiz autenticada (proxy protege) → leva ao dashboard.
  redirect("/dashboard");
}
