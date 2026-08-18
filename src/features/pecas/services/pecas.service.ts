import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  AttachDocumentoInput,
  CreatePecaInput,
  PatchPecaInput,
  PecaAnexo,
  PecaCriadaView,
  PecaDetalheView,
  PecaSalvaView,
  PecasSummary,
  PecaView,
  UpdateAnexoCategoriaInput,
} from "../types";

const ENDPOINT = "/v1/pecas";

// Camada de rede do domínio Peças. Recebe o fetcher ligado ao Clerk (useApi).
// Não conhece React nem cache — isso é responsabilidade dos hooks.

/**
 * Cria uma nova peça a partir de uma intimação.
 * POST /v1/pecas → { data: PecaCriadaView }
 * 201 = criada agora; 200 = já existia (idempotente por intimation_id).
 * Em ambos os casos navegue para /pecas/{data.id}.
 */
export async function createPeca(
  fetcher: ApiFetcher,
  input: CreatePecaInput,
): Promise<{ data: PecaCriadaView }> {
  return fetcher<{ data: PecaCriadaView }>(ENDPOINT, {
    method: "POST",
    body: input,
  });
}

/**
 * Detalhe individual — GET /v1/pecas/:id → { data: PecaDetalheView }.
 * 404 → ApiError kind=ENTITY_NOT_FOUND (peça não existe ou é de outro tenant).
 */
export async function getPeca(
  fetcher: ApiFetcher,
  id: string,
): Promise<{ data: PecaDetalheView }> {
  return fetcher<{ data: PecaDetalheView }>(`${ENDPOINT}/${id}`);
}

/**
 * Autosave — PATCH /v1/pecas/:id → { data: PecaSalvaView }.
 * content vazio é válido (rascunho em branco). title é opcional.
 */
export async function patchPeca(
  fetcher: ApiFetcher,
  id: string,
  patch: PatchPecaInput,
): Promise<{ data: PecaSalvaView }> {
  return fetcher<{ data: PecaSalvaView }>(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

// ── Anexos (Fatia 2) ─────────────────────────────────────────────────────────

/**
 * Vincula um documento já UPLOADED à peça.
 * POST /v1/pecas/:id/anexos → { data: PecaAnexo }
 * 409 = já vinculado; 422 = PENDING/COURT/categoria inválida.
 */
export async function attachDocumento(
  fetcher: ApiFetcher,
  pecaId: string,
  input: AttachDocumentoInput,
): Promise<{ data: PecaAnexo }> {
  return fetcher<{ data: PecaAnexo }>(`${ENDPOINT}/${pecaId}/anexos`, {
    method: "POST",
    body: input,
  });
}

/**
 * Categoriza um anexo em tempo real.
 * PATCH /v1/pecas/:id/anexos/:attachmentId → { data: PecaAnexo }
 */
export async function updateAnexoCategoria(
  fetcher: ApiFetcher,
  pecaId: string,
  attachmentId: string,
  input: UpdateAnexoCategoriaInput,
): Promise<{ data: PecaAnexo }> {
  return fetcher<{ data: PecaAnexo }>(
    `${ENDPOINT}/${pecaId}/anexos/${attachmentId}`,
    { method: "PATCH", body: input },
  );
}

/**
 * Remove o vínculo do anexo.
 * DELETE /v1/pecas/:id/anexos/:attachmentId → 204
 */
export async function removeAnexo(
  fetcher: ApiFetcher,
  pecaId: string,
  attachmentId: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${pecaId}/anexos/${attachmentId}`, {
    method: "DELETE",
  });
}

// ── Stubs preservados para compatibilidade com pecas-list-page (casca) ──────

const PHASE_4 =
  "Peças — lista global chega em fatia futura; o backend de lista ainda não existe.";

export async function fetchPecas(): Promise<PecaView[]> {
  throw new Error(PHASE_4);
}

export async function fetchPecasSummary(): Promise<PecasSummary> {
  throw new Error(PHASE_4);
}
