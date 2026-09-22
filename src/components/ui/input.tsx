import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/40 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 bg-card h-10 w-full min-w-0 rounded-lg border px-3.5 py-2 text-base shadow-xs transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

// InputField — Input padrão de formulário. Estende o Input shadcn com `errorMessage`:
// se houver mensagem, o campo assume o ESTADO DE ERRO (aria-invalid → borda/anel
// vermelhos, herdados das classes aria-invalid do Input) e a mensagem aparece SEMPRE
// ABAIXO do campo (role="alert" + aria-describedby, ligada ao input pra leitores de
// tela). Padrão único de validação de formulário: erro vermelho no input + texto embaixo.
function InputField({
  errorMessage,
  id,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<"input"> & { errorMessage?: string }) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hasError = Boolean(errorMessage);

  return (
    <div className="w-full">
      <Input
        id={fieldId}
        aria-invalid={hasError || ariaInvalid}
        aria-describedby={hasError ? errorId : undefined}
        {...props}
      />
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="text-destructive mt-1.5 text-[12px] leading-snug"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export { Input, InputField };
