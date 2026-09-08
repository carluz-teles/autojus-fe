import { redirect } from "next/navigation";

// Preserve links to the former standalone center; the home is now canonical.
export default function NotificationsRedirect() {
  redirect("/");
}
