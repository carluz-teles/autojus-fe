import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renomeou Middleware → Proxy (mesma funcionalidade). clerkMiddleware
// injeta o contexto de auth (JWT/JWKS) em toda request; o handler lê o token e o
// BE resolve org_id→tenant_id. Sem lógica de sessão pesada aqui (só optimistic checks).
export default clerkMiddleware();

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
