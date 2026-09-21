"use client";

import { ArrowRight, FileText, LockKeyhole, PenLine } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  title: string;
  cnj: string;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  selectedCount: number;
  theses: ReactNode;
  sources: ReactNode;
  onGenerate: () => void;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
}

/** Presentation shared by the real draft flow and the isolated local prototype. */
export function PreparationCanvas({
  title,
  cnj,
  instructions,
  onInstructionsChange,
  selectedCount,
  theses,
  sources,
  onGenerate,
  disabled,
  busy,
  error,
}: Props) {
  return (
    <section
      aria-label="Preparação da peça"
      className="bg-background min-h-0 flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-8 sm:px-10 sm:py-12">
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">01 / Preparação</Badge>
            <span className="text-muted-foreground text-xs">
              02 / Redação e revisão
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="font-display max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">
              Uma boa peça começa
              <br />
              com uma direção clara.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              Defina o que deseja defender. Confira os fundamentos e suas
              fontes. A redação começa quando você estiver pronto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileText aria-hidden className="text-primary size-4" />
            <span className="font-medium">{title}</span>
            <span className="text-muted-foreground break-all">{cnj}</span>
          </div>
        </header>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <section
            className="flex min-w-0 flex-col gap-6"
            aria-label="Direção da peça"
          >
            <div className="bg-card flex flex-col gap-6 rounded-xl border p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <PenLine aria-hidden className="text-primary size-5" />
                <h2 className="font-display text-2xl">
                  Sua estratégia, em palavras.
                </h2>
              </div>
              <FieldGroup>
                <Field data-disabled={busy || undefined}>
                  <FieldLabel htmlFor="piece-instructions">
                    O que esta peça precisa alcançar?
                  </FieldLabel>
                  <Textarea
                    id="piece-instructions"
                    value={instructions}
                    onChange={(event) =>
                      onInstructionsChange(event.target.value)
                    }
                    disabled={busy}
                    className="min-h-56"
                    maxLength={2000}
                    aria-describedby="piece-instructions-help"
                    placeholder="Indique a parte representada, o pedido principal e os pontos que precisam ser enfrentados. Sinalize também o que não deve ser pedido."
                  />
                  <FieldDescription id="piece-instructions-help">
                    Até 2.000 caracteres. Inclua orientações, não fatos
                    presumidos. Informações ausentes devem permanecer como
                    pendências para revisão.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </div>
            <section
              className="flex flex-col gap-4"
              aria-label="Documentos de referência"
            >
              {sources}
            </section>
          </section>
          <section
            aria-label="Seleção de fundamentos"
            className="min-w-0 lg:border-l lg:pl-10"
          >
            {theses}
          </section>
        </div>

        <footer className="bg-background sticky bottom-0 flex flex-col gap-4 border-t py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {selectedCount}{" "}
              {selectedCount === 1
                ? "fundamento selecionado"
                : "fundamentos selecionados"}
            </p>
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <LockKeyhole aria-hidden className="size-3.5" />
              Somente minuta. Nada será assinado ou protocolado.
            </p>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>
          <Button
            size="lg"
            disabled={disabled || busy || !instructions.trim()}
            onClick={onGenerate}
          >
            {busy ? "Iniciando redação…" : "Gerar peça"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </footer>
      </div>
    </section>
  );
}
