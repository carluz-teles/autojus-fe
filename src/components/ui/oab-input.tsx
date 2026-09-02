"use client";

import { IMaskInput } from "react-imask";

// Input de OAB com máscara "UF XXX.XXX" (UF em caixa alta + número agrupado por
// milhar). A máscara é 100% da lib react-imask (IMask) — sem lógica de string
// própria: `UF` = duas letras (uppercased no `prepare`), `num` = MaskedNumber com
// separador de milhar ".". O valor emitido por `onChange` é o texto MASCARADO
// (ex.: "SP 214.885"); a normalização pra chave canônica "UFNUMERO" segue nos
// call sites (parseOabInput), como antes.

const OAB_BLOCKS = {
  UF: { mask: "aa" },
  num: {
    mask: Number,
    scale: 0,
    thousandsSeparator: ".",
    max: 999999,
  },
};

type OabInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function OabInput({
  value,
  onChange,
  placeholder = "UF XXX.XXX",
  ...rest
}: OabInputProps) {
  return (
    <IMaskInput
      mask="UF num"
      lazy
      blocks={OAB_BLOCKS}
      prepare={(str) => str.toUpperCase()}
      value={value}
      onAccept={(masked) => onChange(masked)}
      placeholder={placeholder}
      {...rest}
    />
  );
}
