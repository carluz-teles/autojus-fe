// Lookup de CNPJ na BrasilAPI (Receita) — público, CORS liberado, sem auth. Roda no
// cliente (não passa pelo nosso BE): dado o CNPJ, traz a razão social pra preencher o
// campo do onboarding e poupar digitação. É best-effort — falha (offline, CNPJ novo,
// rate-limit) nunca bloqueia o fluxo; o usuário sempre pode digitar a razão social.

/** Dados úteis do CNPJ pro onboarding. */
export interface CnpjInfo {
  razaoSocial: string;
  nomeFantasia: string;
}

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Consulta a razão social de um CNPJ. Retorna `null` (sem lançar) quando o CNPJ não
 * tem 14 dígitos, a rede falha, ou a Receita não conhece o número — o chamador trata
 * como "não preenchido" e deixa o usuário digitar. `signal` permite cancelar a
 * consulta anterior quando o usuário continua digitando (evita race de resposta).
 */
export async function lookupCnpj(
  cnpj: string,
  signal?: AbortSignal,
): Promise<CnpjInfo | null> {
  const bare = digits(cnpj);
  if (bare.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${bare}`, {
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      razao_social?: string;
      nome_fantasia?: string;
    };
    const razaoSocial = (data.razao_social ?? "").trim();
    if (!razaoSocial) return null;
    return { razaoSocial, nomeFantasia: (data.nome_fantasia ?? "").trim() };
  } catch {
    return null; // AbortError incluso — cancelamento não é erro de UX
  }
}
