import { APP_HOME_PATH } from "@/lib/routes";

// Clerk validates the email link first, then redirects here with its ticket and
// status. The prebuilt auth components finish sign-in/sign-up and membership.
export function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("__clerk_status");
  const ticket = url.searchParams.get("__clerk_ticket");
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };

  if (status === "complete") {
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: new URL(APP_HOME_PATH, url).href },
    });
  }
  if (!ticket || (status !== "sign_in" && status !== "sign_up")) {
    return new Response(
      "Convite inválido. Abra o link original recebido por e-mail ou solicite um novo convite ao administrador.",
      {
        status: 400,
        headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }

  const destination = new URL(
    status === "sign_up" ? "/sign-up" : "/sign-in",
    url,
  );
  destination.searchParams.set("__clerk_ticket", ticket);
  destination.searchParams.set("__clerk_status", status);
  return new Response(null, {
    status: 303,
    headers: { ...headers, Location: destination.href },
  });
}
