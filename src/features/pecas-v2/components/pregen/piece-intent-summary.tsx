"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionItemView } from "@/features/action-items/types";

import type { Preparation } from "../../hooks/use-partida";
import type { RepresentedParty } from "../../lib/piece-intent";

export function PieceIntentSummary({
  value,
  onChange,
  parties,
  actions,
  showMissing,
  disabled,
}: {
  value: Preparation;
  onChange: (value: Preparation) => void;
  parties: RepresentedParty[];
  actions: ActionItemView[];
  showMissing: boolean;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const open = editing || showMissing;
  const change = (key: keyof Preparation, text: string) =>
    onChange({ ...value, [key]: text });
  const types = [
    { value: "MOTION", label: "Manifestação" },
    { value: "DEFENSE", label: "Contestação" },
    { value: "COMPLAINT", label: "Petição inicial" },
    { value: "APPEAL", label: "Recurso" },
    { value: "OTHER", label: "Outra peça" },
  ];
  const select = (
    id: string,
    label: string,
    current: string,
    options: { value: string; label: string }[],
    onSelect: (value: string) => void,
    locked = false,
  ) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={current}
        onValueChange={(v) => onSelect(v ?? "")}
        disabled={disabled || locked}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Selecionar">
            {options.find((o) => o.value === current)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
  return (
    <section
      aria-label="Objetivo e parte representada"
      className="flex flex-col gap-3 border-b pb-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium">
            {value.objective || "Objetivo a definir"}
          </p>
          <p className="text-muted-foreground text-xs">
            {value.client
              ? `${value.client} · ${value.role}`
              : "Parte representada a confirmar"}{" "}
            · {types.find((t) => t.value === value.pieceType)?.label}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Fechar" : "Editar dados"}
        </Button>
      </div>
      {showMissing &&
        (!value.objective.trim() || !value.client.trim() || !value.role) && (
          <p role="alert" className="text-destructive text-sm">
            Informe{" "}
            {!value.objective.trim()
              ? "o objetivo"
              : "a parte representada e o polo"}{" "}
            para gerar a minuta.
          </p>
        )}
      {open && (
        <FieldGroup>
          {actions.length > 1 &&
            select(
              "intent-action",
              "Providência",
              value.actionItemId,
              actions.map((a) => ({ value: a.id, label: a.title })),
              (id) =>
                onChange({
                  ...value,
                  actionItemId: id,
                  objective: actions.find((a) => a.id === id)?.title ?? "",
                }),
            )}
          <Field data-invalid={showMissing && !value.objective.trim()}>
            <FieldLabel htmlFor="intent-objective">Objetivo da peça</FieldLabel>
            <Input
              id="intent-objective"
              value={value.objective}
              maxLength={400}
              disabled={disabled}
              aria-invalid={showMissing && !value.objective.trim()}
              onChange={(e) => change("objective", e.target.value)}
              placeholder="O que a peça deve pedir?"
            />
          </Field>
          {parties.length > 0 &&
            (editing || !value.client.trim() || !value.role) &&
            select(
              "intent-party",
              "Parte do processo",
              parties
                .findIndex(
                  (p) => p.name === value.client && p.role === value.role,
                )
                .toString(),
              [
                ...parties.map((p, i) => ({
                  value: String(i),
                  label: `${p.name} · ${p.role}`,
                })),
                { value: "-1", label: "Informar outra parte" },
              ],
              (v) => {
                const p = parties[Number(v)];
                onChange({
                  ...value,
                  client: p?.name ?? "",
                  role: p?.role ?? "",
                });
              },
            )}
          {(!parties.length ||
            !parties.some(
              (p) => p.name === value.client && p.role === value.role,
            )) && (
            <>
              <Field>
                <FieldLabel htmlFor="intent-client">
                  Parte representada
                </FieldLabel>
                <Input
                  id="intent-client"
                  value={value.client}
                  maxLength={180}
                  disabled={disabled}
                  onChange={(e) => change("client", e.target.value)}
                />
              </Field>
              {select(
                "intent-role",
                "Polo processual",
                value.role,
                ["Autor / Exequente", "Réu / Executado", "Terceiro"].map(
                  (s) => ({ value: s, label: s }),
                ),
                (v) => change("role", v),
              )}
            </>
          )}
          {editing &&
            select(
              "intent-type",
              "Tipo de peça",
              value.pieceType,
              types,
              (v) => change("pieceType", v),
              !!actions.find((a) => a.id === value.actionItemId)
                ?.piece_profile_key,
            )}
        </FieldGroup>
      )}
      <details>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          {value.facts
            ? "Editar orientações adicionais"
            : "Adicionar orientações (opcional)"}
        </summary>
        <Field className="mt-3">
          <FieldLabel htmlFor="intent-notes">
            Orientações e fatos adicionais
          </FieldLabel>
          <Textarea
            id="intent-notes"
            value={value.facts}
            maxLength={650}
            disabled={disabled}
            onChange={(e) => change("facts", e.target.value)}
            placeholder="Acrescente fatos confirmados, documentos de apoio ou dados que ainda faltam."
          />
        </Field>
      </details>
    </section>
  );
}
