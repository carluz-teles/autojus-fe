import { redirect } from "next/navigation";

// /settings abre na primeira aba (Organização).
export default function SettingsPage() {
  redirect("/settings/organization");
}
