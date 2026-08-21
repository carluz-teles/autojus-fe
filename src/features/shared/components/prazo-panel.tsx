"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CalendarClock, Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/mock-ui/button";
import { Field, Input, Switch } from "@/components/mock-ui/input";
import { Segmented } from "@/components/mock-ui/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatarData, formatarDataHora } from "@/lib/utils";

import { USUARIO_ATUAL } from "../db";
import {
  calcularTermoFinal,
  CONTAGEM_LABEL,
  diasRestantes,
  rotuloPrazo,
  TERMO_INICIAL_LABEL,
  TIPOS_PRAZO,
} from "../prazo";
import type { Prazo } from "../types";

const schema = z.object({
  tipo: z.string().min(1, "Informe o tipo de prazo"),
  termoInicial: z.enum(["disponibilizacao", "publicacao", "juntada"]),
  termoInicialData: z.string().min(1),
  dias: z.coerce.number().int().min(1, "Mínimo de 1 dia").max(180),
  contagem: z.enum(["uteis", "corridos"]),
  emDobro: z.boolean(),
  suspensao: z.boolean(),
});

type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

interface Props {
  prazo: Prazo | null;
  publicacao: string;
  providenciasVinculadas: number;
  onSalvar: (prazo: Prazo) => void;
  salvando?: boolean;
}

/**
 * Máquina de estados do prazo. O sistema é determinístico: a regra sugere,
 * o advogado decide, a decisão fica auditada. Quatro estados no mesmo painel —
 * em edição os botões de leitura desaparecem para não competir com o formulário.
 */
export function PrazoPanel({
  prazo,
  publicacao,
  providenciasVinculadas,
  onSalvar,
  salvando,
}: Props) {
  const [editando, setEditando] = useState(false);

  const base = prazo?.derivacao ?? {
    tipo: TIPOS_PRAZO[0],
    termoInicial: "publicacao" as const,
    termoInicialData: publicacao,
    dias: 15,
    contagem: "uteis" as const,
    regra: "definido manualmente",
    emDobro: false,
    suspensao: false,
    confiancaBaixa: false,
  };

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: base.tipo,
      termoInicial: base.termoInicial,
      termoInicialData: base.termoInicialData,
      dias: base.dias,
      contagem: base.contagem,
      emDobro: base.emDobro,
      suspensao: base.suspensao,
    },
  });

  const v = form.watch();
  const previa = calcularTermoFinal({
    ...base,
    ...v,
    dias: Number(v.dias) || 1,
  });

  const abrirEdicao = () => {
    form.reset({
      tipo: base.tipo,
      termoInicial: base.termoInicial,
      termoInicialData: base.termoInicialData,
      dias: base.dias,
      contagem: base.contagem,
      emDobro: base.emDobro,
      suspensao: base.suspensao,
    });
    setEditando(true);
  };

  const auditar = (
    acao: Prazo["auditoria"] extends null
      ? never
      : "confirmou" | "ajustou" | "declarou_sem_prazo",
  ) => ({
    autor: USUARIO_ATUAL,
    quando: new Date().toISOString(),
    acao,
  });

  const confirmar = () => {
    if (!prazo) return;
    onSalvar({
      ...prazo,
      estado: "confirmado",
      termoFinal: calcularTermoFinal(prazo.derivacao),
      auditoria: auditar("confirmou"),
    });
  };

  const semPrazo = () => {
    onSalvar({
      id: prazo?.id ?? "novo",
      estado: "ausente",
      derivacao: { ...base, confiancaBaixa: false },
      termoFinal: null,
      auditoria: auditar("declarou_sem_prazo"),
    });
    setEditando(false);
  };

  const salvar = form.handleSubmit((values) => {
    const derivacao = {
      ...base,
      ...values,
      dias: Number(values.dias),
      confiancaBaixa: false,
    };
    onSalvar({
      id: prazo?.id ?? "novo",
      estado: "ajustado",
      derivacao,
      termoFinal: calcularTermoFinal(derivacao),
      auditoria: auditar("ajustou"),
    });
    setEditando(false);
  });

  const estado = editando ? "editando" : (prazo?.estado ?? "ausente");
  const confirmado = estado === "confirmado" || estado === "ajustado";

  return (
    <section
      className={cn(
        "rounded-xl border p-5",
        estado === "sugerido" &&
          "border-[color-mix(in_oklch,var(--gold)_35%,transparent)] bg-[color-mix(in_oklch,var(--gold)_8%,transparent)]",
        estado === "editando" && "border-border bg-card",
        confirmado &&
          "border-[color-mix(in_oklch,var(--success)_30%,transparent)] bg-[color-mix(in_oklch,var(--success)_7%,transparent)]",
        estado === "ausente" &&
          "border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_6%,transparent)]",
      )}
    >
      {estado === "sugerido" && prazo && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-gold text-xs tracking-wider uppercase">
                Prazo sugerido — aguardando sua confirmação
              </p>
              <Contagem
                dias={prazo.termoFinal ? diasRestantes(prazo.termoFinal) : 0}
                termoFinal={prazo.termoFinal}
                sufixo="termo final em"
              />
            </div>

            <dl className="grid gap-x-8 gap-y-1.5 text-xs sm:grid-cols-2">
              <Par rotulo="Tipo" valor={prazo.derivacao.tipo} />
              <Par
                rotulo="Termo inicial"
                valor={`${TERMO_INICIAL_LABEL[prazo.derivacao.termoInicial]} · ${formatarData(prazo.derivacao.termoInicialData)}`}
              />
              <Par
                rotulo="Contagem"
                valor={`${prazo.derivacao.dias} ${CONTAGEM_LABEL[prazo.derivacao.contagem]}${prazo.derivacao.emDobro ? " · em dobro" : ""}`}
              />
              <Par rotulo="Regra" valor={prazo.derivacao.regra} />
            </dl>
          </div>

          {prazo.derivacao.confiancaBaixa && (
            <p className="text-destructive flex items-center gap-2 text-xs">
              <AlertTriangle className="size-3.5" />
              Confiança baixa na extração — revise antes de confirmar.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-[color-mix(in_oklch,var(--gold)_25%,transparent)] pt-4">
            <Button size="sm" onClick={confirmar} disabled={salvando}>
              <Check className="size-3.5" />
              Confirmar prazo
            </Button>
            <Button size="sm" variant="outline" onClick={abrirEdicao}>
              <Pencil className="size-3.5" />
              Ajustar
            </Button>
            <Button size="sm" variant="ghost" onClick={semPrazo}>
              Não há prazo
            </Button>
            <p className="text-muted-foreground ml-auto text-xs">
              {providenciasVinculadas} providência(s) dependem deste prazo.
            </p>
          </div>
        </div>
      )}

      {confirmado && prazo?.termoFinal && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-success text-xs tracking-wider uppercase">
              Prazo confirmado
            </p>
            <Contagem
              dias={diasRestantes(prazo.termoFinal)}
              termoFinal={prazo.termoFinal}
              sufixo="Fatal em"
              extra={`${prazo.derivacao.dias} ${CONTAGEM_LABEL[prazo.derivacao.contagem]}`}
            />
            {prazo.auditoria && (
              <p className="text-muted-foreground mt-3 text-xs">
                {prazo.auditoria.acao === "ajustou"
                  ? "Ajustado e confirmado por"
                  : "Confirmado por"}{" "}
                {prazo.auditoria.autor} ·{" "}
                <span className="tabular-nums">
                  {formatarDataHora(prazo.auditoria.quando)}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={abrirEdicao}>
              <Pencil className="size-3.5" />
              Editar prazo
            </Button>
            <Button size="sm" variant="ghost" onClick={semPrazo}>
              Remover prazo
            </Button>
          </div>
        </div>
      )}

      {estado === "ausente" && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-destructive mt-0.5 size-4" />
            <div>
              <p className="text-sm font-medium">
                Nenhum prazo identificado nesta intimação
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {prazo?.auditoria
                  ? `Declarado sem prazo por ${prazo.auditoria.autor} · ${formatarDataHora(prazo.auditoria.quando)}`
                  : "Se houver prazo a cumprir, adicione — nada entra na agenda sem decisão humana."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={abrirEdicao}>
              Adicionar prazo
            </Button>
            {!prazo?.auditoria && (
              <Button size="sm" variant="outline" onClick={semPrazo}>
                Marcar como mera ciência
              </Button>
            )}
          </div>
        </div>
      )}

      {estado === "editando" && (
        <form onSubmit={salvar} className="space-y-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-muted-foreground size-4" />
            <h2 className="text-sm font-medium">Ajustar prazo</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tipo de prazo"
              error={form.formState.errors.tipo?.message}
            >
              <Select
                value={v.tipo}
                onValueChange={(valor) =>
                  valor != null && form.setValue("tipo", valor)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PRAZO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Termo inicial">
              <Select
                items={TERMO_INICIAL_LABEL}
                value={v.termoInicial}
                onValueChange={(valor) =>
                  valor != null &&
                  form.setValue(
                    "termoInicial",
                    valor as FormValues["termoInicial"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o termo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TERMO_INICIAL_LABEL).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Dias" error={form.formState.errors.dias?.message}>
              <Input
                type="number"
                min={1}
                className="tabular-nums"
                {...form.register("dias")}
              />
            </Field>

            <Field label="Contagem">
              <Segmented
                valor={v.contagem}
                onChange={(c) => form.setValue("contagem", c)}
                opcoes={[
                  { valor: "uteis", label: "dias úteis" },
                  { valor: "corridos", label: "dias corridos" },
                ]}
              />
            </Field>
          </div>

          <div className="border-border space-y-3 border-t pt-4">
            <Switch
              label="Prazo em dobro"
              hint="art. 186 / 229, CPC"
              checked={v.emDobro}
              onCheckedChange={(val) => form.setValue("emDobro", val)}
            />
            <Switch
              label="Feriado local / suspensão forense"
              hint="soma os dias suspensos ao termo final"
              checked={v.suspensao}
              onCheckedChange={(val) => form.setValue("suspensao", val)}
            />
          </div>

          <div className="border-border bg-background rounded-lg border p-4">
            <p className="text-muted-foreground text-xs tracking-wider uppercase">
              Termo final
            </p>
            <p className="font-display mt-1 text-2xl tabular-nums">
              {formatarData(previa)}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Ao confirmar, {providenciasVinculadas} providência(s) vinculada(s)
              passam a vencer em {formatarData(previa)}.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditando(false)}
            >
              <X className="size-3.5" />
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvando}>
              <Check className="size-3.5" />
              Salvar e confirmar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Contagem({
  dias,
  termoFinal,
  sufixo,
  extra,
}: {
  dias: number;
  termoFinal: string | null;
  sufixo: string;
  extra?: string;
}) {
  return (
    <div className="mt-2 flex items-baseline gap-3">
      <span className="font-display text-4xl leading-none tabular-nums">
        {Math.abs(dias)}
      </span>
      <span className="text-muted-foreground text-sm">
        {rotuloPrazo(dias)}
        <span className="block">
          {sufixo}{" "}
          <strong className="text-foreground font-medium tabular-nums">
            {termoFinal ? formatarData(termoFinal) : "—"}
          </strong>
          {extra ? ` · ${extra}` : ""}
        </span>
      </span>
    </div>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}
