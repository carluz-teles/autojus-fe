"use client";

import { IMaskInput } from "react-imask";

// Input de CNPJ com máscara "00.000.000/0000-00". A máscara é 100% da lib
// react-imask (IMask) — sem lógica de string própria, espelhando OabInput: `0` é
// um dígito obrigatório do IMask. O valor emitido por `onChange` é o texto
// MASCARADO (ex.: "11.222.333/0001-81"); a normalização pra dígitos segue no call
// site (o submit do onboarding faz digits(doc)), como no OAB.

type CnpjInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function CnpjInput({
  value,
  onChange,
  placeholder = "00.000.000/0000-00",
  ...rest
}: CnpjInputProps) {
  return (
    <IMaskInput
      mask="00.000.000/0000-00"
      lazy
      value={value}
      onAccept={(masked) => onChange(masked)}
      placeholder={placeholder}
      {...rest}
    />
  );
}
