// Máscaras progressivas de exibição para campos brasileiros. Formatam ENQUANTO o
// usuário digita (input controlado via RHF: mutamos e.target.value antes do
// onChange do register). A validação e o payload continuam trabalhando só com
// dígitos — máscara é apresentação, nunca dado.

const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** 00.000.000/0000-00 (14 dígitos). */
export function maskCnpj(value: string): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** 00000-000 (8 dígitos). */
export function maskCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

/** (00) 0000-0000 fixo ou (00) 00000-0000 celular (10-11 dígitos). */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{4})$/, "$1-$2");
}
