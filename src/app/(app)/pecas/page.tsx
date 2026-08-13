import { PecasListPage } from "@/features/pecas/components/pecas-list-page";

// Rota da lista global de Peças (/pecas). Shell = Server Component; delega a UI
// (Client Component) à feature. CASCA fiel ao design LEXIA — o backend de Peças é
// FASE 4 e ainda não existe, então a tela não renderiza dado real.
export default function PecasRoute() {
  return <PecasListPage />;
}
