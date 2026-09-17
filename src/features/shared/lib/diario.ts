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
