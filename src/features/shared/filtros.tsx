"use client";

import { Filter } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Field, SearchInput } from "@/components/mock-ui/input";
import { Sheet } from "@/components/mock-ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { EQUIPE, USUARIO_ATUAL } from "./db";
import type { Urgencia } from "./prazo";

export interface CampoFiltro {
  chave: string;
  label: string;
  opcoes: { valor: string; label: string }[];
}

export interface VisaoRapida {
  chave: string;
  label: string;
}

export interface ConfigFiltro {
  visoes: VisaoRapida[];
  campos: CampoFiltro[];
}

const PRAZO_OPCOES = [
  { valor: "atraso", label: "Em atraso" },
  { valor: "hoje", label: "Vence hoje" },
  { valor: "48h", label: "Próximas 48h" },
  { valor: "7d", label: "Próximos 7 dias" },
  { valor: "sem", label: "Sem prazo" },
];

const pessoas = EQUIPE.map((p) => ({ valor: p, label: p }));
const simples = (vs: string[]) => vs.map((v) => ({ valor: v, label: v }));

/**
 * Duas camadas por decisão de UX: o advogado não pensa em filtros, pensa em
 * perguntas ("o que está atrasado?", "o que é meu?"). As visões rápidas
 * respondem em um clique; o drawer serve o recorte fino.
 */
export const CONFIG_FILTROS: Record<string, ConfigFiltro> = {
  intimacoes: {
    visoes: [
      { chave: "atraso", label: "Em atraso" },
      { chave: "hoje", label: "Vencem hoje" },
      { chave: "minhas", label: "Minhas" },
      { chave: "semprov", label: "Sem providência" },
    ],
    campos: [
      { chave: "responsavel", label: "Responsável", opcoes: pessoas },
      { chave: "prazo", label: "Prazo", opcoes: PRAZO_OPCOES },
      {
        chave: "etapa",
        label: "Etapa do peticionamento",
        opcoes: simples([
          "Triagem",
          "Peça",
          "Revisão",
          "Assinatura",
          "Protocolo",
        ]),
      },
      {
        chave: "orgao",
        label: "Órgão julgador",
        opcoes: simples([
          "Juizado Especial Cível de Franca",
          "01 Cível de Franca",
          "02 Cível de Franca",
          "Anexo Fiscal",
        ]),
      },
    ],
  },
  processos: {
    visoes: [
      { chave: "atraso", label: "Com prazo em atraso" },
      { chave: "48h", label: "Prazo em 48h" },
      { chave: "minhas", label: "Meus processos" },
      { chave: "sem", label: "Sem prazo aberto" },
    ],
    campos: [
      { chave: "responsavel", label: "Responsável", opcoes: pessoas },
      { chave: "prazo", label: "Prazo a vencer", opcoes: PRAZO_OPCOES },
      {
        chave: "situacao",
        label: "Situação",
        opcoes: simples(["Em andamento", "Suspenso", "Arquivado", "Baixado"]),
      },
      {
        chave: "classe",
        label: "Classe",
        opcoes: simples([
          "Execução de título extrajudicial",
          "Cumprimento de sentença",
          "Procedimento comum cível",
          "Execução fiscal",
        ]),
      },
    ],
  },
  tarefas: {
    visoes: [
      { chave: "atraso", label: "Atrasadas" },
      { chave: "hoje", label: "Vencem hoje" },
      { chave: "minhas", label: "Minhas" },
      { chave: "48h", label: "Próximas 48h" },
    ],
    campos: [
      { chave: "responsavel", label: "Responsável", opcoes: pessoas },
      { chave: "prazo", label: "Vencimento", opcoes: PRAZO_OPCOES },
      {
        chave: "status",
        label: "Status",
        opcoes: simples(["Aberta", "Em execução", "Concluída", "Atrasada"]),
      },
      {
        chave: "prioridade",
        label: "Prioridade",
        opcoes: simples(["Alta", "Média", "Baixa"]),
      },
    ],
  },
  pecas: {
    visoes: [
      { chave: "atraso", label: "Prazo em atraso" },
      { chave: "hoje", label: "Prazo hoje" },
      { chave: "minhas", label: "Minhas" },
      { chave: "assinar", label: "Aguardando assinatura" },
    ],
    campos: [
      { chave: "responsavel", label: "Responsável", opcoes: pessoas },
      { chave: "prazo", label: "Prazo", opcoes: PRAZO_OPCOES },
      {
        chave: "status",
        label: "Status",
        opcoes: simples([
          "Rascunho",
          "Revisada",
          "Assinada",
          "Aguardando protocolo",
          "Protocolada",
        ]),
      },
    ],
  },
  contatos: {
    visoes: [
      { chave: "cliente", label: "Clientes" },
      { chave: "contraria", label: "Partes contrárias" },
    ],
    campos: [
      {
        chave: "papel",
        label: "Papel",
        opcoes: simples(["Cliente", "Parte contrária"]),
      },
      {
        chave: "cidade",
        label: "Cidade",
        opcoes: simples(["Franca", "Ribeirão Preto"]),
      },
    ],
  },
};

export interface EstadoFiltro {
  busca: string;
  visao: string | null;
  campos: Record<string, string>;
}

export const FILTRO_VAZIO: EstadoFiltro = {
  busca: "",
  visao: null,
  campos: {},
};

export interface Registro {
  urgencia: Urgencia;
  texto: string;
  semProvidencia?: boolean;
}

/** Predicado único usado por todas as listas. */
export function passaFiltro(reg: Registro, filtro: EstadoFiltro): boolean {
  const busca = filtro.busca.trim().toLowerCase();
  if (busca && !reg.texto.toLowerCase().includes(busca)) return false;

  for (const [chave, valor] of Object.entries(filtro.campos)) {
    if (!valor) continue;
    if (chave === "prazo") {
      if (!naJanela(reg.urgencia, valor)) return false;
      continue;
    }
    if (!reg.texto.toLowerCase().includes(valor.toLowerCase())) return false;
  }

  const v = filtro.visao;
  if (!v) return true;
  if (v === "minhas")
    return reg.texto.toLowerCase().includes(USUARIO_ATUAL.toLowerCase());
  if (v === "semprov") return !!reg.semProvidencia;
  if (v === "assinar") return /rascunho|revisada|aguardando/i.test(reg.texto);
  if (v === "cliente")
    return /cliente/i.test(reg.texto) && !/contrária/i.test(reg.texto);
  if (v === "contraria") return /contrária/i.test(reg.texto);
  return naJanela(reg.urgencia, v);
}

function naJanela(u: Urgencia, alvo: string): boolean {
  if (alvo === "atraso") return u === "atraso";
  if (alvo === "hoje") return u === "hoje";
  if (alvo === "48h") return u === "atraso" || u === "hoje" || u === "48h";
  if (alvo === "7d") return u !== "sem";
  if (alvo === "sem") return u === "sem";
  return true;
}

export function FilterBar({
  tela,
  filtro,
  onChange,
  placeholder = "Buscar nesta lista…",
  extra,
}: {
  tela: keyof typeof CONFIG_FILTROS;
  filtro: EstadoFiltro;
  onChange: (f: EstadoFiltro) => void;
  placeholder?: string;
  extra?: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const config = CONFIG_FILTROS[tela];
  const ativos = Object.entries(filtro.campos).filter(([, v]) => v);

  const setCampo = (chave: string, valor: string) =>
    onChange({ ...filtro, campos: { ...filtro.campos, [chave]: valor } });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <SearchInput
          wrapperClassName="w-[300px]"
          placeholder={placeholder}
          value={filtro.busca}
          onChange={(e) => onChange({ ...filtro, busca: e.target.value })}
        />

        {config.visoes.map((v) => {
          const on = filtro.visao === v.chave;
          return (
            <button
              key={v.chave}
              type="button"
              onClick={() =>
                onChange({ ...filtro, visao: on ? null : v.chave })
              }
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                on
                  ? "text-primary border-[color-mix(in_oklch,var(--primary)_40%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]"
                  : "border-border bg-card text-muted-foreground hover:border-[color-mix(in_oklch,var(--primary)_40%,transparent)]",
              )}
            >
              {v.label}
            </button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setDrawer(true)}
        >
          <Filter className="size-3.5" />
          Filtros
          {ativos.length > 0 && (
            <span className="bg-primary text-primary-foreground grid size-4.5 place-items-center rounded-full text-[10px] tabular-nums">
              {ativos.length}
            </span>
          )}
        </Button>

        {extra}
      </div>

      {ativos.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ativos.map(([chave, valor]) => {
            const campo = config.campos.find((c) => c.chave === chave);
            const label =
              campo?.opcoes.find((o) => o.valor === valor)?.label ?? valor;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setCampo(chave, "")}
                className="text-primary flex cursor-pointer items-center gap-2 rounded-full border border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-[color-mix(in_oklch,var(--primary)_7%,transparent)] px-2.5 py-1 text-xs"
              >
                {campo?.label}: {label}
                <span className="opacity-70">✕</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange(FILTRO_VAZIO)}
            className="text-muted-foreground cursor-pointer px-1 py-1 text-xs underline underline-offset-[3px]"
          >
            Limpar tudo
          </button>
        </div>
      )}

      <Sheet
        aberto={drawer}
        titulo="Filtros"
        descricao="Refine a listagem pelos filtros disponíveis."
        onFechar={() => setDrawer(false)}
        onLimpar={() => onChange(FILTRO_VAZIO)}
      >
        {config.campos.map((c) => {
          const campoValor = filtro.campos[c.chave] ?? "";
          // Mapa value→label para o <SelectValue/> renderizar o rótulo.
          const items = {
            __todos__: "Todos",
            ...Object.fromEntries(c.opcoes.map((o) => [o.valor, o.label])),
          };
          return (
            <Field key={c.chave} label={c.label}>
              <Select
                items={items}
                value={campoValor || "__todos__"}
                onValueChange={(v) =>
                  setCampo(c.chave, v === "__todos__" || v == null ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {c.opcoes.map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        })}
      </Sheet>
    </>
  );
}
