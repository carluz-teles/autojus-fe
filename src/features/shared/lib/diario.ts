// Rótulo do diário por UF — fonte única usada tanto pela Termos tab
// (Configurações, mockada) quanto pelo passo "Seus processos" do onboarding
// (real). Puramente apresentacional: não afeta o que é de fato salvo (hoje só
// a OAB em si) — só decora a UI com o mesmo texto nos dois lugares.
export const DIARIO_POR_UF: Record<string, string> = {
  SP: "Diários do estado de São Paulo",
  MG: "Diários do estado de Minas Gerais",
  RJ: "Diários do estado do Rio de Janeiro",
  PR: "Diários do estado do Paraná",
};

export function diarioLabelPorUf(uf: string): string {
  return DIARIO_POR_UF[uf] ?? `Diários do estado de ${uf}`;
}

/** Extrai UF + número de uma OAB no formato "UFNUMERO" (ex.: "SP123456"). */
export function parseOab(oab: string): { uf: string; numero: string } {
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
