// Rótulos pt-BR dos papéis de membro do escritório (role do OrgMemberView) — o
// card de Responsável Interno do cockpit consome daqui (Regra nº1: uma fonte).

const ROLE_LABEL: Record<string, string> = {
  LAWYER: "Advogado",
  ADMIN: "Administrador",
};

/** Papel do membro em pt-BR; cai no valor cru quando desconhecido. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/**
 * Nome de exibição de um membro/responsável: usa o nome; se vazio (comum em
 * contas Clerk de teste sem nome preenchido), cai para a parte local do
 * e-mail; se nenhum dos dois existir, string vazia — NUNCA o id/uuid cru
 * (fonte única; antes duplicada em cada tela que resolve responsável).
 */
export function nomeExibicao(
  name?: string | null,
  email?: string | null,
): string {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  return e ? e.split("@")[0] : "";
}
