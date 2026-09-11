import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

// Next.js 16 renomeou Middleware → Proxy (mesma funcionalidade). clerkMiddleware
// injeta o contexto de auth (JWT/JWKS); o BE resolve org_id→tenant_id.
// A LP é liberada antes do Clerk. Na plataforma, público = auth + convite;
// todo o resto exige sessão (auth.protect() redireciona para
// NEXT_PUBLIC_CLERK_SIGN_IN_URL quando não autenticado).
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/convite(.*)",
]);

const platformMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

const publicDiscoveryPaths = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llm.text",
]);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Marketing is public and can render without Clerk or a backend connection.
  // Match only this page and its metadata, never similarly prefixed app routes.
  if (
    request.nextUrl.pathname === "/lp" ||
    request.nextUrl.pathname.startsWith("/lp/") ||
    publicDiscoveryPaths.has(request.nextUrl.pathname)
  ) {
    return NextResponse.next();
  }
  return platformMiddleware(request, event);
}

export const config = {
  matcher: [
    // Pula internals do Next e arquivos estáticos, exceto quando em query params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|pdf|zip|webmanifest)).*)",
    // Sempre roda em rotas de API.
    "/(api|trpc)(.*)",
    // Sempre roda nas rotas de frontend API do Clerk.
    "/__clerk/(.*)",
  ],
};
