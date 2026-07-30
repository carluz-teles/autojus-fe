import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renomeou Middleware → Proxy (mesma funcionalidade). clerkMiddleware
// injeta o contexto de auth (JWT/JWKS); o BE resolve org_id→tenant_id.
// Público = telas de auth; todo o resto exige sessão (auth.protect() redireciona
// para NEXT_PUBLIC_CLERK_SIGN_IN_URL quando não autenticado).
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Pula internals do Next e arquivos estáticos, exceto quando em query params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Sempre roda em rotas de API.
    "/(api|trpc)(.*)",
    // Sempre roda nas rotas de frontend API do Clerk.
    "/__clerk/(.*)",
  ],
};
