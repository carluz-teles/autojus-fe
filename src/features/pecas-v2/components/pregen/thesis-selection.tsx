"use client";

import { useAuth } from "@clerk/nextjs";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ApplyThesisSelection({
  added,
  removed,
  disabled,
  onApply,
}: {
  added: number;
  removed: number;
  disabled: boolean;
  onApply: () => Promise<void>;
}) {
  const { userId, orgId } = useAuth();
  const [open, setOpen] = useState(false);
  const [skipNext, setSkipNext] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const preferenceKey = userId
    ? `thesis-confirmation:${orgId ?? "personal"}:${userId}`
    : null;
  const apply = async (remember = false) => {
    if (disabled || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    try {
      await onApply();
      if (remember && preferenceKey) {
        try {
          localStorage.setItem(preferenceKey, "skip");
        } catch {}
      }
      setOpen(false);
    } catch {
      // The caller reports the error; keep confirmation available for retry.
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  };
  const requestToggle = () => {
    if (applyingRef.current || disabled) return;
    let skip = false;
    try {
      skip ||=
        !!preferenceKey && localStorage.getItem(preferenceKey) === "skip";
    } catch {}
    if (skip) {
      void apply();
      return;
    }
    setSkipNext(false);
    setOpen(true);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (applyingRef.current || disabled) return;
        if (!next) {
          setOpen(false);
          return;
        }
        requestToggle();
      }}
    >
      <PopoverTrigger
        disabled={disabled || applying}
        aria-label="Aplicar alterações nos fundamentos"
        render={<Button size="xs" disabled={disabled || applying} />}
      >
        {applying ? (
          <LoaderCircle
            data-icon="inline-start"
            className="motion-safe:animate-spin"
          />
        ) : (
          <Sparkles data-icon="inline-start" />
        )}
        {applying ? "Aplicando…" : "Aplicar"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4"
      >
        <PopoverHeader>
          <PopoverTitle>Aplicar alterações nas teses?</PopoverTitle>
          <p className="text-muted-foreground text-xs">
            {added} {added === 1 ? "adição" : "adições"} · {removed}{" "}
            {removed === 1 ? "remoção" : "remoções"}
          </p>
          <PopoverDescription>
            A peça inteira será redigida novamente com os fundamentos
            selecionados, incluindo os trechos editados. A versão atual ficará
            no histórico.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center gap-2">
          <Checkbox
            id={"skip-thesis-batch"}
            checked={skipNext}
            disabled={applying}
            onCheckedChange={(value) => setSkipNext(value === true)}
          />
          <Label htmlFor={"skip-thesis-batch"}>Não perguntar novamente</Label>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={applying}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={applying || disabled}
            onClick={() => void apply(skipNext)}
          >
            {applying ? "Aplicando…" : "Aplicar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
