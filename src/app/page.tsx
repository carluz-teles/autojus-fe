import { redirect } from "next/navigation";

export default function Home() {
  // Raiz autenticada (proxy protege) → leva à Inbox.
  redirect("/prazos");
}
