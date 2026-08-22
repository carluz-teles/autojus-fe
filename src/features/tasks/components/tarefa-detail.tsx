"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Avatar } from "@/components/mock-ui/data-display";
import { DatePicker } from "@/components/mock-ui/date-picker";
import { Input } from "@/components/mock-ui/input";
import { Segmented } from "@/components/mock-ui/layout";
import { Chip, StatusBadge, type Tom } from "@/components/mock-ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EQUIPE } from "@/features/shared/db";
import {
  useAddComentario,
  useIntimacao,
  useTarefa,
  useUpdateTarefa,
} from "@/features/shared/hooks";
import type {
  TarefaPrioridade,
  TarefaStatus,
  TarefaTipo,
} from "@/features/shared/types";
import { formatarData, formatarDataHora } from "@/lib/utils";

// Mapas de apresentação do detalhe mock (antes importados da view; a view foi
// migrada pro BE real e não os expõe mais). Débito: migrar este detalhe também.
const TOM_TAREFA: Record<TarefaStatus, Tom> = {
  Aberta: "neutral",
  "Em execução": "info",
  Concluída: "success",
  Atrasada: "danger",
  Cancelada: "warning",
};

const COR_PRIORIDADE: Record<string, string> = {
  Alta: "var(--destructive)",
  Média: "var(--gold)",
  Baixa: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
};

const STATUS: TarefaStatus[] = [
  "Aberta",
  "Em execução",
  "Concluída",
  "Atrasada",
  "Cancelada",
];
const TIPOS: TarefaTipo[] = [
  "Providência",
  "Diligência",
  "Interna",
  "Prazo judicial",
];
const PRIORIDADES: TarefaPrioridade[] = ["Alta", "Média", "Baixa"];

const COR_STATUS: Record<TarefaStatus, string> = {
  Aberta: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
  "Em execução": "var(--gold)",
  Concluída: "var(--success)",
  Atrasada: "var(--destructive)",
  Cancelada: "color-mix(in oklch, var(--muted-foreground) 40%, transparent)",
};

/** Detalhe no estilo Linear: título e conversa à esquerda, propriedades à direita. */
export function TarefaDetail({ id }: { id: string }) {
  const { data: t, isLoading } = useTarefa(id);
  const atualizar = useUpdateTarefa(id);
  const comentar = useAddComentario(id);
  const intimacao = useIntimacao(t?.intimacaoId ?? "i1");
  const [aba, setAba] = useState<"comentarios" | "atividade">("comentarios");
  const [rascunho, setRascunho] = useState("");

  if (isLoading || !t) {
    return (
      <div className="p-10">
        <div className="bg-muted h-8 w-80 animate-pulse rounded" />
      </div>
    );
  }

  const proc = intimacao.data?.processoRef;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-y-auto px-10 pt-8 pb-10">
        <div className="flex items-center gap-2.5">
          <Chip>{t.codigo}</Chip>
          <StatusBadge tone={TOM_TAREFA[t.status]}>{t.status}</StatusBadge>
        </div>

        <h1 className="font-display mt-3.5 max-w-160 text-3xl leading-tight font-normal tracking-tight">
          {t.titulo}
        </h1>
        <p className="mt-4 max-w-160 text-[15px] leading-relaxed text-pretty">
          {t.descricao}
        </p>
        <p className="text-muted-foreground mt-3 text-[12.5px]">
          Derivada da intimação pela IA · vinculada a{" "}
          <Link href={`/intimacoes/${t.intimacaoId}`}>
            {intimacao.data?.titulo ?? "intimação"}
          </Link>
        </p>

        <div className="border-border mt-9 border-t pt-5">
          <Segmented
            valor={aba}
            onChange={setAba}
            opcoes={[
              {
                valor: "comentarios",
                label: "Comentários",
                contagem: String(t.comentarios.length),
              },
              { valor: "atividade", label: "Atividade" },
            ]}
          />

          {aba === "comentarios" ? (
            <div className="mt-5 flex max-w-160 flex-col gap-4.5">
              {t.comentarios.length === 0 && (
                <p className="text-muted-foreground text-[13.5px]">
                  Nenhum comentário ainda.
                </p>
              )}
              {t.comentarios.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[30px_minmax(0,1fr)] gap-3"
                >
                  <Avatar nome={c.autor} size={30} />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium">{c.autor}</span>
                      <span className="text-muted-foreground text-[11.5px] tabular-nums">
                        {formatarDataHora(c.quando)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed">
                      {c.texto}
                    </p>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                <Avatar nome="Luan Gomes" size={30} destaque />
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Escrever um comentário…"
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="self-start"
                    disabled={!rascunho.trim() || comentar.isPending}
                    onClick={() => {
                      comentar.mutate(rascunho.trim());
                      setRascunho("");
                    }}
                  >
                    Comentar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ul className="mt-5 max-w-160">
              {t.atividade.map((a) => (
                <li
                  key={a.id}
                  className="border-border flex items-baseline justify-between gap-4 border-b py-2.5 text-[13px] last:border-0"
                >
                  <span>
                    <span className="font-medium">{a.autor}</span> {a.evento}
                    {a.de && a.para && (
                      <>
                        {" "}
                        de{" "}
                        <span className="line-through opacity-60">
                          {a.de}
                        </span>{" "}
                        para <span className="font-medium">{a.para}</span>
                      </>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11.5px] tabular-nums">
                    {formatarDataHora(a.quando)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="border-border overflow-y-auto border-l px-6 pt-8 pb-10">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
          Propriedades
        </p>

        <div className="mt-3.5 flex flex-col">
          <Propriedade rotulo="Status">
            <Select
              value={t.status}
              onValueChange={(v) =>
                v != null && atualizar.mutate({ status: v as TarefaStatus })
              }
            >
              <SelectTrigger className="w-46" aria-label="Status da tarefa">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: COR_STATUS[t.status] }}
                    />
                    {t.status}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: COR_STATUS[s] }}
                    />
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Tipo">
            <Select
              value={t.tipo}
              onValueChange={(v) =>
                v != null && atualizar.mutate({ tipo: v as TarefaTipo })
              }
            >
              <SelectTrigger className="w-46" aria-label="Tipo da tarefa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {TIPOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Prioridade">
            <Select
              value={t.prioridade}
              onValueChange={(v) =>
                v != null &&
                atualizar.mutate({ prioridade: v as TarefaPrioridade })
              }
            >
              <SelectTrigger className="w-46" aria-label="Prioridade da tarefa">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: COR_PRIORIDADE[t.prioridade] }}
                    />
                    {t.prioridade}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {PRIORIDADES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: COR_PRIORIDADE[s] }}
                    />
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Responsável">
            <Select
              value={t.responsavel}
              onValueChange={(v) =>
                v != null && atualizar.mutate({ responsavel: v })
              }
            >
              <SelectTrigger
                className="w-46"
                aria-label="Responsável pela tarefa"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {EQUIPE.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Propriedade>

          <Propriedade rotulo="Vencimento">
            <DatePicker
              valor={t.vencimento}
              onChange={(iso) => atualizar.mutate({ vencimento: iso })}
            />
          </Propriedade>
        </div>

        <p className="text-muted-foreground mt-7 text-[11px] font-medium tracking-[0.08em] uppercase">
          Origem
        </p>
        <div className="mt-3.5 flex flex-col">
          <Link
            href={`/intimacoes/${t.intimacaoId}`}
            className="border-border flex flex-col gap-1 border-b py-2.5 no-underline hover:no-underline"
          >
            <span className="text-muted-foreground text-[12.5px]">
              Intimação
            </span>
            <span className="text-primary inline-flex items-center gap-1.5 text-[13px]">
              {intimacao.data?.titulo}
              <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
            </span>
          </Link>
          {proc && (
            <>
              <Link
                href={`/processos/${encodeURIComponent(proc.numero)}`}
                className="border-border flex flex-col gap-1 border-b py-2.5 no-underline hover:no-underline"
              >
                <span className="text-muted-foreground text-[12.5px]">
                  Processo
                </span>
                <span className="text-primary inline-flex items-center gap-1.5 text-[13px] tabular-nums">
                  {proc.numero}
                  <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
                </span>
              </Link>
              <div className="border-border flex flex-col gap-1 border-b py-2.5">
                <span className="text-muted-foreground text-[12.5px]">
                  Órgão julgador
                </span>
                <span className="text-[13px]">{proc.orgao}</span>
              </div>
            </>
          )}
          <div className="border-border flex items-center justify-between gap-3 border-b py-2.5">
            <span className="text-muted-foreground text-[12.5px]">
              Prazo da intimação
            </span>
            <span className="text-gold text-[13px] tabular-nums">
              {intimacao.data?.prazo?.termoFinal
                ? formatarData(intimacao.data.prazo.termoFinal)
                : "—"}
            </span>
          </div>
        </div>

        <p className="text-muted-foreground mt-7 text-[11px] font-medium tracking-[0.08em] uppercase">
          Etiquetas
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.etiquetas.map((e) => (
            <span
              key={e}
              className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-[11.5px]"
            >
              {e}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Propriedade({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-3 border-b py-2.5">
      <span className="text-muted-foreground text-[12.5px]">{rotulo}</span>
      {children}
    </div>
  );
}
