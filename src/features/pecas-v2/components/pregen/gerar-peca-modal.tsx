"use client";

// Modal de orientação opcional da geração de peça.
// Abre a partir do botão "Gerar peça" na disposição da intimação.
//
// A11y: role=dialog, aria-labelledby, foco-trap (base-ui Dialog), Esc + backdrop
//       cancelam (sem criar draft). Textarea autofocus.
//
// [Pular]      → generate com instructions=""
// [Gerar peça] → generate com o texto digitado
//
// O componente é puramente de apresentação + binding.
// A lógica de navegação fica no caller (use-disposicao / disposicao-section).

import { Dialog } from "@base-ui/react/dialog";
import { Sparkles, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface GerarPecaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado com o texto digitado (pode ser ""). Responsabilidade do caller navegar. */
  onGenerate: (instructions: string) => void;
  /** Rótulo da peça (ex.: "Contestação") — aparece no subtítulo. */
  pecaLabel?: string;
}

export function GerarPecaModal({
  open,
  onOpenChange,
  onGenerate,
  pecaLabel,
}: GerarPecaModalProps) {
  const titleId = useId();
  const [instructions, setInstructions] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSkip() {
    onGenerate("");
    setInstructions("");
    onOpenChange(false);
  }

  function handleGenerate() {
    const value = instructions.trim();
    onGenerate(value);
    setInstructions("");
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Esc / backdrop = CANCEL. Limpa sem criar draft.
      setInstructions("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 backdrop-blur-[2px]",
            "bg-[color-mix(in_oklch,var(--foreground)_34%,transparent)]",
            "transition-opacity duration-200",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />

        {/* Centered popup */}
        <Dialog.Popup
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-6",
            "data-[starting-style]:[transform:translateY(8px)_scale(0.98)] data-[starting-style]:opacity-0",
            "data-[ending-style]:[transform:translateY(8px)_scale(0.98)] data-[ending-style]:opacity-0",
            "transition-all duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          )}
          onAnimationStart={() => {
            // Autofocus the textarea when the dialog opens
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        >
          <div className="bg-card border-line shadow-pop w-full max-w-[520px] rounded-2xl border p-6">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-primary flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                <Sparkles aria-hidden className="size-3.5 shrink-0" />
                Orientar a geração · opcional
              </div>
              <Dialog.Close
                aria-label="Fechar"
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <X aria-hidden />
              </Dialog.Close>
            </div>

            <Dialog.Title
              id={titleId}
              className="font-display mb-1 text-[22px] font-medium"
            >
              Alguma orientação para esta peça?
            </Dialog.Title>

            <Dialog.Description className="text-muted-foreground mb-4 text-[13px] leading-relaxed">
              Diga o foco, se quiser (ex.: priorizar nulidade processual,
              enfatizar prescrição). Sem orientação, geramos com{" "}
              <strong>todas as teses recomendadas</strong>
              {pecaLabel ? ` para a ${pecaLabel}` : ""} — você remove depois as
              que não fizerem sentido.
            </Dialog.Description>

            {/* Instructions textarea — pattern from preparation-canvas */}
            <Field>
              <FieldLabel
                htmlFor={`${titleId}-instructions`}
                className="sr-only"
              >
                Orientações para a geração
              </FieldLabel>
              <Textarea
                ref={textareaRef}
                id={`${titleId}-instructions`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={2000}
                className="min-h-24"
                placeholder="Opcional — ex.: focar na ilegitimidade passiva e pedir a extinção sem resolução de mérito…"
                aria-describedby={`${titleId}-desc`}
                autoFocus
              />
              <FieldDescription id={`${titleId}-desc`}>
                Até 2.000 caracteres.
              </FieldDescription>
            </Field>

            {/* Footer row */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-[11.5px]">
                Somente minuta. Nada assinado ou protocolado.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleSkip}>
                  Pular
                </Button>
                <Button onClick={handleGenerate}>
                  <Sparkles data-icon="inline-start" />
                  Gerar peça
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
