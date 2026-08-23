"use client";

import { ArrowUpRight, Download, Loader2, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  useExportPeca,
  useFilePeca,
  usePeca,
  usePreviewAttachment,
  useRemoveAttachment,
  useSalvarRascunho,
  useSignPeca,
  useUpdateAttachmentCategory,
  useUpdateResult,
  useUploadAttachment,
  validateAttachmentSize,
} from "@/features/pecas/hooks/use-peca";
import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  type PecaAttachment,
} from "@/features/pecas/types";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { formatBytes, formatClaimValueBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AssistentePanel } from "./assistente-panel";
import { EditorToolbar } from "./editor-toolbar";
import { type PassoPeca, StepperPeca } from "./stepper-peca";

// "salvo há …" — tempo relativo curto em pt-BR, recalculado a cada minuto.
function tempoRelativo(from: Date | null): string {
  if (!from) return "";
  const segundos = Math.floor((Date.now() - from.getTime()) / 1000);
  if (segundos < 5) return "agora mesmo";
  if (segundos < 60) return `há ${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas} h`;
}

// Contagem de palavras/caracteres do texto real do editor.
function contarTexto(texto: string): { palavras: number; caracteres: number } {
  const limpo = texto.trim();
  const palavras = limpo === "" ? 0 : limpo.split(/\s+/).length;
  return { palavras, caracteres: texto.length };
}

export function PecaWorkspace({ id }: { id: string }) {
  const { data: peca, isLoading, isError } = usePeca(id);
  const { save, saveNow, isSaving, lastSavedAt } = useSalvarRascunho(id);
  const signPeca = useSignPeca();
  const filePeca = useFilePeca();
  const updateResult = useUpdateResult();
  const exportPeca = useExportPeca();

  // Deriva o step a partir do status da peça (computado, não via useEffect).
  const passoPorStatus: PassoPeca = (() => {
    if (!peca) return 1;
    if (peca.status === "FILED") return 3;
    if (peca.status === "SIGNED") return 2;
    return 1;
  })();

  // Permite navegação manual temporária (clicando no stepper) que é
  // "resetada" quando a peça muda de status.
  const [passoOverride, setPassoOverride] = useState<PassoPeca | null>(null);
  const passo = passoOverride ?? passoPorStatus;

  const handleSetPasso = (p: PassoPeca) => {
    setPassoOverride(p);
  };

  // Reseta override quando a peça muda de status.
  const prevStatus = useRef(peca?.status);
  useEffect(() => {
    if (peca?.status !== prevStatus.current) {
      prevStatus.current = peca?.status;
      setPassoOverride(null);
    }
  }, [peca?.status]);

  // Contagem viva do editor — semeada do content real, atualizada a cada tecla.
  const [contagem, setContagem] = useState({ palavras: 0, caracteres: 0 });
  // Tick para reavaliar o "salvo há …" sem depender de nova digitação.
  const [, setTick] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const semeado = useRef(false);

  // Estados para o modal de protocolo (step 3).
  const [showFileModal, setShowFileModal] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [observedResult, setObservedResult] = useState("");

  useEffect(() => {
    if (peca && !semeado.current && editorRef.current) {
      editorRef.current.textContent = peca.content;
      setContagem(contarTexto(peca.content));
      semeado.current = true;
    }
  }, [peca]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return <div className="p-8">Carregando…</div>;
  }
  if (isError || !peca) {
    return (
      <div className="text-muted-foreground p-8">
        Não foi possível carregar a peça.
      </div>
    );
  }

  const proc = peca.process;
  const intim = peca.intimation;
  const prazo = peca.deadline;
  const termo = prazo?.end_date ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const corPrazo = corDaUrgencia(urgenciaDe(dias));

  const rotuloSalvo = isSaving
    ? "Salvando…"
    : lastSavedAt
      ? `Rascunho salvo ${tempoRelativo(lastSavedAt)}`
      : "Rascunho";

  const isDraft = peca.status === "DRAFT";
  const isSigned = peca.status === "SIGNED";
  const isFiled = peca.status === "FILED";

  const handleSaveNow = () => {
    const texto = editorRef.current?.textContent ?? "";
    save(texto);
    saveNow();
  };

  const handleAdvance = () => {
    if (passo === 1 && isDraft) {
      // Avança para assinatura — sign a peça.
      signPeca.mutate(id, {
        onSuccess: () => {
          toast.success("Peça assinada com sucesso.");
        },
        onError: () => toast.error("Não foi possível assinar a peça."),
      });
    } else if (passo === 2 && isSigned) {
      // Avança para protocolo — abre modal de receipt.
      setShowFileModal(true);
    }
  };

  const handleFile = () => {
    let parsedReceipt: Record<string, unknown> | undefined;
    if (receipt.trim()) {
      try {
        parsedReceipt = JSON.parse(receipt);
      } catch {
        parsedReceipt = { notes: receipt };
      }
    }
    filePeca.mutate(
      { id, params: { receipt: parsedReceipt } },
      {
        onSuccess: () => {
          toast.success("Peça protocolada com sucesso.");
          setShowFileModal(false);
        },
        onError: () => toast.error("Não foi possível protocolar a peça."),
      },
    );
  };

  const handleResult = () => {
    if (!observedResult) return;
    updateResult.mutate(
      { id, observedResult },
      {
        onSuccess: () => {
          toast.success("Resultado registrado.");
          setShowResultModal(false);
        },
        onError: () => toast.error("Não foi possível registrar o resultado."),
      },
    );
  };

  const handleExport = () => {
    exportPeca.mutate(
      { id, format: "docx" },
      {
        onSuccess: (res) => {
          window.open(res.url, "_blank");
        },
        onError: () => toast.error("Não foi possível exportar a peça."),
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-[1230px] flex-col overflow-x-auto">
      <div className="border-border flex items-center gap-6 border-b px-8 py-4">
        {intim ? (
          <Link
            href={`/intimacoes/${intim.id}`}
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
        <StepperPeca atual={passo} onIr={handleSetPasso} />

        {/* Botões de ação do header */}
        <div className="ml-auto flex items-center gap-2">
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNow}
              disabled={isSaving}
            >
              <Save className="mr-1.5 size-3.5" />
              {isSaving ? "Salvando…" : "Salvar rascunho"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleAdvance}
            disabled={
              signPeca.isPending ||
              filePeca.isPending ||
              (passo === 1 && !isDraft) ||
              (passo === 2 && !isSigned)
            }
          >
            {signPeca.isPending
              ? "Assinando…"
              : filePeca.isPending
                ? "Protocolando…"
                : passo === 1
                  ? "Avançar"
                  : passo === 2
                    ? "Protocolar"
                    : "Concluído"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {passo === 1 && (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(560px,1fr)_330px]">
          {/* Contexto: intimação, teor, processo, partes, prazo */}
          <aside className="border-border overflow-y-auto border-r px-4 py-6">
            <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
              Contexto
            </p>
            <h3 className="font-display mt-2 text-[19px] font-medium">
              {rotuloTipoPeca(peca.piece_type)}
            </h3>
            {proc && (
              <p className="text-muted-foreground text-[11.5px] tabular-nums">
                {proc.cnj_number}
              </p>
            )}

            {/* Prazo em destaque no topo do contexto */}
            <div className="border-border my-4 border-y py-3">
              <p className="text-muted-foreground text-xs">Prazo</p>
              <p
                className="font-display text-xl tabular-nums"
                style={{ color: corPrazo }}
              >
                {termo ? formatDate(termo) : "—"}
              </p>
              <p className="text-muted-foreground text-[11.5px]">
                {rotuloPrazo(dias)} · dias úteis
              </p>
            </div>

            {intim && (
              <>
                <Rotulo>Intimação de origem</Rotulo>
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
                <p className="border-border text-muted-foreground max-h-33 overflow-y-auto border-l-2 pl-2.5 text-[11.5px] leading-relaxed whitespace-pre-wrap">
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
                <Campo
                  rotulo="Valor da causa"
                  valor={formatClaimValueBRL(proc.claim_value ?? "")}
                />

                <Rotulo className="mt-6">Partes</Rotulo>
                <CampoEmpilhado
                  rotulo="Autor"
                  valores={proc.plaintiffs ?? []}
                />
                <CampoEmpilhado rotulo="Réu" valores={proc.defendants ?? []} />
              </>
            )}

            <Rotulo className="mt-6">Anexos</Rotulo>
            <AnexosSection pecaId={peca.id} anexos={peca.attachments} />
          </aside>

          {/* Papel: editor real, autosave por debounce */}
          <section className="overflow-y-auto">
            <EditorToolbar />
            <div className="px-8 pt-7 pb-8">
              <div className="border-border bg-card mx-auto max-w-180 rounded-lg border px-[clamp(24px,5vw,56px)] py-8 shadow-sm">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Corpo da peça"
                  className="min-h-120 text-[14.5px] leading-[1.85] whitespace-pre-wrap outline-none"
                  onInput={(e) => {
                    const texto = e.currentTarget.textContent ?? "";
                    setContagem(contarTexto(texto));
                    save(texto);
                  }}
                />
              </div>
              <div className="text-muted-foreground mx-auto mt-3 flex max-w-180 justify-between text-[11.5px] tabular-nums">
                <span>
                  {contagem.palavras} palavras · {contagem.caracteres}{" "}
                  caracteres
                </span>
                <span>{rotuloSalvo}</span>
              </div>
            </div>
          </section>

          <AssistentePanel pecaId={peca.id} review={peca.review ?? null} />
        </div>
      )}

      {passo === 2 && (
        <div className="mx-auto w-full max-w-220 px-8 py-8">
          <h1 className="font-display text-[34px] font-normal">Assinatura</h1>
          <p className="text-muted-foreground mt-2 text-[13.5px]">
            {isSigned
              ? "Esta peça já foi assinada."
              : "Clique em 'Protocolar' no cabeçalho para assinar e avançar para o protocolo."}
          </p>
          {isSigned && (
            <Button className="mt-4" onClick={() => setShowFileModal(true)}>
              Protocolar
            </Button>
          )}
        </div>
      )}

      {passo === 3 && (
        <div className="mx-auto w-full max-w-220 px-8 py-8">
          <h1 className="font-display text-[34px] font-normal">Protocolo</h1>
          <p className="text-muted-foreground mt-2 text-[13.5px]">
            {isFiled
              ? "Esta peça já foi protocolada."
              : "Protocole a peça e registre o resultado."}
          </p>
          {isFiled && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResultModal(true)}
              >
                Registrar resultado
              </Button>
              <Button onClick={handleExport}>Exportar</Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de protocolo (step 2 → 3) */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-lg">
            <h2 className="font-display text-lg font-medium">
              Protocolar peça
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Informe o comprovante de protocolo (JSON ou texto).
            </p>
            <textarea
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder='{"protocol_number": "123456", "court": "TJSP"}'
              className="border-border placeholder:text-muted-foreground/50 focus:ring-ring mt-4 w-full rounded-lg border px-3 py-2 font-mono text-[13px] focus:ring-1 focus:outline-none"
              rows={5}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFileModal(false)}
                disabled={filePeca.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleFile} disabled={filePeca.isPending}>
                {filePeca.isPending ? "Protocolando…" : "Protocolar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado (step 3) */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-lg">
            <h2 className="font-display text-lg font-medium">
              Resultado observado
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Qual foi o resultado desta peça?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {[
                { value: "OK", label: "Procedente" },
                { value: "AMENDMENT", label: "Emenda" },
                { value: "UNKNOWN", label: "Não conhecido" },
                { value: "UNTIMELY", label: "Intempestivo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setObservedResult(opt.value)}
                  className={cn(
                    "border-border rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                    observedResult === opt.value
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/40",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResultModal(false)}
                disabled={updateResult.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResult}
                disabled={updateResult.isPending || !observedResult}
              >
                {updateResult.isPending ? "Salvando…" : "Registrar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Rotulo({
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

// Aba Anexos: upload presigned (3 passos) + vincular + categorizar + remover +
// pré-visualizar. Cada item expande no hover para revelar categoria e remoção.
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
