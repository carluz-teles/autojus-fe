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
