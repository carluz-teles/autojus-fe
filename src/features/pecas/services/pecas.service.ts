import type {
  PecaDetalheView,
  PecasSummary,
  PecaView,
} from "@/features/pecas/types";

// Serviço de Peças — PLACEHOLDER da Fase 4. O backend de Peças (domínio advisory:
// draft → review → petition) ainda NÃO existe: não há rota /v1/pecas. Este arquivo
// mantém o contrato service → hook → component pronto para quando a Fase 4 chegar,
// mas NÃO faz I/O e NÃO devolve dado falso. As telas são cascas fiéis ao design.
//
// Quando a Fase 4 entregar os endpoints, cada função abaixo passa a chamar
// `apiFetch` (src/lib/api/client) — como intimacoes/prazos já fazem — e o
// componente troca a casca por dado real. Até lá, chamar qualquer uma lança, de
// propósito, para impedir uso acidental de "dado real" inexistente.

const PHASE_4 =
  "Peças chega na Fase 4 — o backend de produção de peças ainda não existe.";

export async function fetchPecas(): Promise<PecaView[]> {
  throw new Error(PHASE_4);
}

export async function fetchPecasSummary(): Promise<PecasSummary> {
  throw new Error(PHASE_4);
}

export async function fetchPeca(_id: string): Promise<PecaDetalheView> {
  throw new Error(PHASE_4);
}
