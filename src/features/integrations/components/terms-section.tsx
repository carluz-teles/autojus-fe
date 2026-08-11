"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";

import { useActivateForm } from "../hooks/use-activate-form";

// Termos monitorados: as OABs que guiam a descoberta (e, no futuro, CNPJs e
// outros termos). Substitui o antigo ActivateForm — mesma lógica (useActivateForm),
// agora semeada com o scope JÁ ativo para editar em vez de recomeçar do zero.
export function TermsSection({ initialOab }: { initialOab?: string[] }) {
  const {
    oab,
    oabDraft,
    setOabDraft,
    addOab,
    removeOab,
    onSubmit,
    isActivating,
    activateError,
    isForbidden,
    justSucceeded,
    errors,
  } = useActivateForm({ initialOab });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-tight">
          Termos monitorados
        </CardTitle>
        <CardDescription>
          O que vigiamos nas fontes de descoberta: as OABs abaixo guiam a
          captura no DJEN (CNPJs e nomes de parte em breve). Alterações valem
          para as próximas capturas — a diária continua sozinha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="oab-input">OABs</Label>
            <div className="flex max-w-md gap-2">
              <Input
                id="oab-input"
                placeholder="ex.: SP123456"
                autoCapitalize="characters"
                value={oabDraft}
                onChange={(e) => setOabDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOab();
                  }
                }}
                aria-describedby="oab-help"
              />
              <Button type="button" variant="outline" onClick={addOab}>
                Adicionar
              </Button>
            </div>
            <p id="oab-help" className="text-muted-foreground text-xs">
              UF em maiúsculas + número de inscrição (Enter para adicionar).
            </p>
            {oab.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {oab.map((reg) => (
                  <Badge
                    key={reg}
                    variant="secondary"
                    className="gap-1 font-mono tabular-nums"
                  >
                    {reg}
                    <button
                      type="button"
                      onClick={() => removeOab(reg)}
                      aria-label={`Remover ${reg}`}
                      className="hover:text-destructive rounded-sm"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            {errors.oab ? (
              <p className="text-destructive text-sm">{errors.oab.message}</p>
            ) : null}
          </div>

          {isForbidden ? (
            <p className="text-destructive text-sm" role="alert">
              Você atingiu o limite de processos ativos do seu plano.{" "}
              <Link
                href="/settings/billing"
                className="font-medium underline underline-offset-2"
              >
                Fazer upgrade
              </Link>
            </p>
          ) : activateError ? (
            <p className="text-destructive text-sm" role="alert">
              {activateError instanceof ApiError
                ? activateError.message
                : "Não foi possível salvar. Tente novamente."}
            </p>
          ) : null}
          {justSucceeded ? (
            <p className="text-primary text-sm" role="status">
              Termos atualizados.
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={isActivating}>
              {isActivating ? "Salvando…" : "Salvar termos"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
