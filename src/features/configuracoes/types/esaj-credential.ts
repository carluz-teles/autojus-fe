// Tipos da credencial e-SAJ (login + senha do advogado), usada pelo protocolo
// automático de peças (Fatia 1 — docs/erd-execucao-judicial-tjsp.md).
//
// Cadastro: POST /v1/esaj-credentials → { login, password, terms_version }.
// A senha é cifrada no cofre KMS do BE e NUNCA volta em nenhuma leitura.
// Leitura: GET /v1/esaj-credentials → { data: EsajCredentialView[] }
// Remoção: DELETE /v1/esaj-credentials/:id → 204

/** Credencial e-SAJ cadastrada. A senha nunca é devolvida pelo BE. */
export interface EsajCredentialView {
  id: string;
  owner_user_id: string;
  login: string;
  terms_version: string;
  terms_accepted_at: string;
  created_at: string;
}
