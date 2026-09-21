// Utilitários de OAB — fonte única usada pela Termos tab (Configurações) e pelo
// passo "Seus processos" do onboarding. Puramente apresentacional.

/** Extrai UF + número de uma OAB no formato "UFNUMERO" (ex.: "SP123456"). */
function parseOab(oab: string): { uf: string; numero: string } {
  const uf = oab.slice(0, 2);
  const numero = oab.slice(2);
  return { uf, numero };
}

/** Formata para exibição no padrão "NÚMERO/UF" (ex.: "123456/SP"). */
export function formatOabDisplay(oab: string): string {
  const { uf, numero } = parseOab(oab);
  return `${numero}/${uf}`;
}

/** Formata no padrão dos Termos (Configurações): "UF XXX.XXX" — UF + número
 * agrupado em milhares (ex.: "SP347019" → "SP 347.019"). Fonte única usada tanto
 * na aba Termos quanto no passo de OABs do onboarding, pra os cards baterem. */
export function formatOabTermo(oab: string): string {
  const { uf, numero } = parseOab(oab);
  const agrupado = numero
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${uf.toUpperCase()} ${agrupado}`;
}
