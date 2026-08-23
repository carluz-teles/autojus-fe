"use client";

// Shell do fluxo de peticionamento (header próprio + coluna Contexto 300px).
// Reusada pela tela de partida (PecaPartida) e pelo editor (PecaWorkspace) pra
// garantir mesma estrutura visual em todo o fluxo, conforme o mockup.

import { ArrowUpRight, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type { IntimacaoType } from "@/features/intimacoes/types";
import {
  usePreviewAttachment,
  useRemoveAttachment,
  useUpdateAttachmentCategory,
  useUploadAttachment,
  validateAttachmentSize,
} from "@/features/pecas/hooks/use-peca";
import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  type PecaAttachment,
  type PecaDetail,
} from "@/features/pecas/types";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { useTasksDaIntimacao } from "@/features/tasks/hooks/use-tasks-da-intimacao";
import { formatBytes, formatClaimValueBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { type PassoPeca, StepperPeca } from "./stepper-peca";

// ── Top bar (breadcrumb + stepper + slot de ações) ───────────────────────────

interface PecaTopBarProps {
  peca: PecaDetail;
  passo: PassoPeca;
  onSetPasso?: (p: PassoPeca) => void;
  /** Botões/ações renderizadas à direita do stepper. Opcional. */
  actions?: React.ReactNode;
}

export function PecaTopBar({
  peca,
  passo,
  onSetPasso,
  actions,
}: PecaTopBarProps) {
  const cnj = peca.process?.cnj_number;

  // Publica trilha "Peticionamento › Processo {CNJ}" no header do AppShell —
  // fiel ao mockup. Sem CNJ (peça blank / de processo sem case_id), publica
  // só "Peticionamento". Referência estável (deps primitivas).
  const crumbs = useMemo(
    () =>
      cnj
        ? [{ label: "Peticionamento" }, { label: `Processo ${cnj}` }]
        : [{ label: "Peticionamento" }],
    [cnj],
  );
  useSetBreadcrumb(crumbs);

  return (
    <div className="border-border flex items-center gap-6 border-b px-8 py-4">
      {cnj ? (
        <p className="text-muted-foreground text-xs">
          <span>Peticionamento</span>
          <span className="mx-2 text-[10px]">›</span>
          <Link
            href={`/processos/${encodeURIComponent(cnj)}`}
            className="text-foreground tabular-nums no-underline hover:no-underline"
          >
            Processo {cnj}
          </Link>
        </p>
      ) : peca.intimation ? (
        <Link
          href={`/intimacoes/${peca.intimation.id}`}
          className="text-muted-foreground text-xs no-underline hover:no-underline"
        >
          ← Intimações
        </Link>
      ) : (
        <Link
          href="/pecas"
          className="text-muted-foreground text-xs no-underline hover:no-underline"
        >
          ← Peças
        </Link>
      )}
      <StepperPeca atual={passo} onIr={onSetPasso ?? (() => {})} />
      {actions && (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ── Coluna Contexto (aside 300px) ────────────────────────────────────────────

export function PecaContexto({ peca }: { peca: PecaDetail }) {
  const proc = peca.process;
  const intim = peca.intimation;
  const prazo = peca.deadline;
  const termo = prazo?.end_date ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const corPrazo = corDaUrgencia(urgenciaDe(dias));

  // Providências = tasks vinculadas à intimação da peça.
  const { tasks: providencias } = useTasksDaIntimacao(intim?.id ?? null);

  return (
    <aside className="border-border overflow-y-auto border-r px-4 py-6">
      {/* Bloco Prazo (topo) — sem cabeçalho "Contexto"/tipo peça acima. */}
      <div className="pb-3">
        <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
          Prazo
        </p>
        <p
          className="font-display mt-1.5 text-xl tabular-nums"
          style={{ color: corPrazo }}
        >
          {termo ? formatDate(termo) : "—"}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11.5px]">
          {rotuloPrazo(dias)}
        </p>
      </div>

      {intim && (
        <>
          <Rotulo className="mt-4">Intimação de origem</Rotulo>
          <Link
            href={`/intimacoes/${intim.id}`}
            className="block no-underline hover:no-underline"
          >
            <span className="text-primary inline-flex items-center gap-1.5 text-[13px] font-medium">
              {TYPE_LABEL[intim.type as IntimacaoType] ?? intim.type}
              <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
            </span>
            <span className="text-muted-foreground mt-0.5 block text-[11.5px]">
              publicada em {formatDate(intim.made_available_at)}
            </span>
          </Link>

          <Rotulo className="mt-3.5">Teor da publicação</Rotulo>
          <p className="border-border text-muted-foreground max-h-33 overflow-y-auto border-l-2 pl-2.5 text-[11.5px] leading-[1.6] whitespace-pre-wrap">
            {intim.content}
          </p>
        </>
      )}

      {proc && (
        <>
          <Rotulo className="mt-6">Processo</Rotulo>
          <Link
            href={`/processos/${encodeURIComponent(proc.cnj_number)}`}
            className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] tabular-nums"
          >
            {proc.cnj_number}
            <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
          </Link>
          <Campo rotulo="Classe" valor={proc.class || "—"} />
          <Campo rotulo="Assunto" valor={proc.subject || "—"} />
          <Campo rotulo="Órgão" valor={proc.judging_body || "—"} />
          <Campo
            rotulo="Tribunal · grau"
            valor={`${proc.court} · ${proc.degree}`}
          />
          {proc.claim_value ? (
            <Campo
              rotulo="Valor da causa"
              valor={formatClaimValueBRL(proc.claim_value)}
            />
          ) : null}

          {proc.plaintiffs?.length || proc.defendants?.length ? (
            <>
              <Rotulo className="mt-6">Partes</Rotulo>
              <CampoEmpilhado rotulo="Autor" valores={proc.plaintiffs ?? []} />
              <CampoEmpilhado rotulo="Réu" valores={proc.defendants ?? []} />
            </>
          ) : null}
        </>
      )}

      {providencias.length > 0 && (
        <>
          <Rotulo className="mt-6">Providências</Rotulo>
          <div className="flex flex-col gap-1.5">
            {providencias.map((t) => (
              <div
                key={t.id}
                className="flex gap-2 py-1 text-[12.5px] leading-[1.35]"
              >
                <span className="text-[var(--gold)]">•</span>
                <div className="min-w-0 flex-1">
                  <span className="block">{t.title}</span>
                  <Link
                    href={`/tarefas?task=${t.id}`}
                    className="text-primary mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] no-underline hover:no-underline"
                  >
                    {t.source ? `${t.source} · ` : ""}
                    {t.status === "DONE"
                      ? "Concluída"
                      : t.status === "DISMISSED"
                        ? "Descartada"
                        : "Aberta"}
                    <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Rotulo className="mt-6">Anexos</Rotulo>
      <AnexosSection pecaId={peca.id} anexos={peca.attachments} />
    </aside>
  );
}

// ── Primitives de contexto (labels e campos) ─────────────────────────────────

export function Rotulo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mb-1.5 text-[10.5px] tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-border flex justify-between gap-2.5 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

function CampoEmpilhado({
  rotulo,
  valores,
}: {
  rotulo: string;
  valores: string[];
}) {
  return (
    <div className="border-border border-b py-1.5 text-xs">
      <span className="text-muted-foreground block text-[11px]">{rotulo}</span>
      {valores.length === 0 ? (
        <span className="text-muted-foreground mt-0.5 block">—</span>
      ) : (
        valores.map((v) => (
          <span key={v} className="mt-0.5 block">
            {v}
          </span>
        ))
      )}
    </div>
  );
}

// ── Anexos: upload presigned (3 passos) + vincular + categorizar + remover ──

function AnexosSection({
  pecaId,
  anexos,
}: {
  pecaId: string;
  anexos: PecaAttachment[];
}) {
  const { uploadAttachment, isUploading, progress } =
    useUploadAttachment(pecaId);
  const updateCategoria = useUpdateAttachmentCategory(pecaId);
  const removerAnexo = useRemoveAttachment(pecaId);
  const previsualizar = usePreviewAttachment();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validacao = validateAttachmentSize(file);
    if (!validacao.ok) {
      toast.error(
        validacao.reason === "vazio"
          ? "Arquivo vazio não pode ser anexado."
          : "Arquivo excede o limite de 50MB.",
      );
      return;
    }
    uploadAttachment(file, {
      onError: () => toast.error("Não foi possível anexar o documento."),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {anexos.length === 0 ? (
        <p className="text-muted-foreground text-[11.5px]">
          Nenhum documento anexado.
        </p>
      ) : (
        anexos.map((a) => (
          <div
            key={a.id}
            className="border-border group flex flex-col gap-1.5 rounded-lg border px-2 py-1.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => previsualizar.mutate(a.document_id)}
                className="truncate text-left hover:underline"
                title={a.name}
              >
                {a.name}
              </button>
              <div className="flex flex-none items-center gap-1.5">
                <span className="text-muted-foreground">
                  {formatBytes(a.size_bytes)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    removerAnexo.mutate(a.id, {
                      onError: () =>
                        toast.error("Não foi possível remover o anexo."),
                    })
                  }
                  disabled={removerAnexo.isPending}
                  className="text-muted-foreground hover:text-destructive hidden group-hover:inline-flex"
                  aria-label={`Remover ${a.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
            <Select
              value={a.category}
              onValueChange={(v) =>
                updateCategoria.mutate({
                  attachmentId: a.id,
                  category: v as AttachmentCategory,
                })
              }
            >
              <SelectTrigger className="h-6 w-full text-[11px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTACHMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-[11px]">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="text-muted-foreground hover:bg-muted/40 rounded-lg border border-transparent px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-60"
      >
        {isUploading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Enviando{progress !== null ? ` ${progress}%` : "…"}
          </span>
        ) : (
          "+ Anexar documento"
        )}
      </button>
    </div>
  );
}
