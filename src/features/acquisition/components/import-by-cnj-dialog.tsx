"use client";

import {
  ArrowRight,
  CheckCircle2,
  CloudOff,
  Download,
  Info,
  LoaderCircle,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMe } from "@/features/onboarding/hooks/use-me";
import { cn } from "@/lib/utils";

import { type ImportPhase, useImportByCnj } from "../hooks/use-import-cnj";

// Metadados dos estados terminais/de erro (tom + ícone + textos). O estado
// "running" é tratado à parte por ter spinner e badges.
const RESULT: Record<
  Exclude<ImportPhase, "input" | "running">,
  { tone: string; icon: LucideIcon; title: string; detail: string }
> = {
  ok: {
    tone: "border-primary/20 bg-primary/5 text-primary",
    icon: CheckCircle2,
    title: "Processo importado",
    detail: "O processo está no acervo. As intimações chegam em seguida.",
  },
  already: {
    tone: "border-info/20 bg-info/5 text-info",
    icon: Info,
    title: "Processo já está no seu acervo",
    detail: "Nada foi duplicado — a importação é idempotente.",
  },
  failed: {
    tone: "border-destructive/20 bg-destructive/5 text-destructive",
    icon: XCircle,
    title: "Processo não encontrado nas bases públicas",
    detail: "DJEN e DATAJUD não retornaram resultado para este número.",
  },
  invalid: {
    tone: "border-destructive/20 bg-destructive/5 text-destructive",
    icon: XCircle,
    title: "CNJ inválido ou tribunal não suportado",
    detail: "Confira o número e tente novamente.",
  },
  limit: {
    tone: "border-info/20 bg-info/5 text-info",
    icon: Info,
    title: "Limite do plano atingido",
    detail:
      "O escritório atingiu o limite de processos ativos do plano, ou seu papel não permite importar.",
  },
  unavailable: {
    tone: "border-gold/20 bg-gold/5 text-gold-foreground",
    icon: CloudOff,
    title: "Importação indisponível no momento",
    detail: "O recurso não está configurado neste ambiente. Tente mais tarde.",
  },
  error: {
    tone: "border-destructive/20 bg-destructive/5 text-destructive",
    icon: XCircle,
    title: "Não foi possível importar",
    detail: "Ocorreu um erro inesperado. Tente novamente.",
  },
};

/**
 * Botão + sheet de importação manual por CNJ, no header da lista de Processos.
 * Só aparece para ADMIN (o BE também barra LAWYER com 403). O sheet só é montado
 * quando aberto, para nascer com o estado limpo a cada abertura.
 */
export function ImportByCnjDialog() {
  const me = useMe();
  const [open, setOpen] = useState(false);

  if (me.data?.role !== "ADMIN") return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download data-icon="inline-start" />
        Importar por CNJ
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        {open ? <ImportForm onClose={() => setOpen(false)} /> : null}
      </Sheet>
    </>
  );
}

function ImportForm({ onClose }: { onClose: () => void }) {
  const uid = useId();
  const router = useRouter();
  const { cnj, setCnj, submit, phase, courtRecordId } = useImportByCnj();
  const terminalGoto = phase === "ok" || phase === "already";
  const running = phase === "running";

  function openProcess() {
    if (!courtRecordId) return;
    onClose();
    router.push(`/processos/${courtRecordId}`);
  }

  const result = phase === "input" || running ? null : RESULT[phase];

  return (
    <SheetContent
      title="Importar processo por CNJ"
      description="Cole o número CNJ para trazer o processo pelo pipeline de aquisição. Disponível apenas para administradores."
      footer={
        terminalGoto ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={openProcess}>
              Abrir processo
              <ArrowRight data-icon="inline-end" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={running}>
              Cancelar
            </Button>
            <Button type="submit" form={uid} disabled={!cnj || running}>
              {running ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              {running ? "Importando…" : "Importar processo"}
            </Button>
          </>
        )
      }
    >
      <form
        id={uid}
        onSubmit={(e) => {
          e.preventDefault();
          if (!cnj || running) return;
          submit();
        }}
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor={`${uid}-cnj`}>Número CNJ</FieldLabel>
            <Input
              id={`${uid}-cnj`}
              className="font-mono"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000000-00.0000.0.00.0000"
              value={cnj}
              onChange={(e) => setCnj(e.target.value)}
            />
            <FieldDescription>
              Formato NNNNNNN-DD.AAAA.J.TR.OOOO (ou 20 dígitos). O dígito
              verificador e o tribunal são validados no servidor.
            </FieldDescription>
          </Field>

          {running ? (
            <div
              role="status"
              aria-live="polite"
              className="border-info/20 bg-info/5 flex flex-col gap-2.5 rounded-lg border p-4"
            >
              <div className="text-foreground flex items-center gap-2 font-medium">
                <LoaderCircle
                  className="text-info size-4 animate-spin"
                  aria-hidden
                />
                Importando processo…
              </div>
              <p className="text-muted-foreground text-sm">
                Buscando metadados no DATAJUD e intimações no DJEN. O processo
                pode aparecer na lista antes de estar 100% preenchido.
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">RUNNING</Badge>
                <Badge variant="outline" className="font-mono">
                  MANUAL_IMPORT
                </Badge>
              </div>
            </div>
          ) : result ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                result.tone,
              )}
            >
              <result.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-foreground font-medium">{result.title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {result.detail}
                </p>
              </div>
            </div>
          ) : null}
        </FieldGroup>
      </form>
    </SheetContent>
  );
}
