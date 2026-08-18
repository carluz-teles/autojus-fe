"use client";

import {
  AlignLeft,
  Bold,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  FileUp,
  Gavel,
  Italic,
  Link2,
  List,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RefreshCw,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useCategorizarAnexo,
  usePrevisualizarAnexo,
  useRemoverAnexo,
  useUploadAnexo,
  validarTamanhoAnexo,
} from "@/features/pecas/hooks/use-anexos-peca";
import { useAutosavePeca } from "@/features/pecas/hooks/use-autosave-peca";
import { usePeca } from "@/features/pecas/hooks/use-peca";
import {
  ANEXO_CATEGORIAS,
  type AnexoCategoria,
  type PecaAnexo,
  type PecaSuggestion,
} from "@/features/pecas/types";
import { daysLeftLabel, prazoStatusLabel } from "@/features/prazos/lib/labels";
import type { PrazoStatus } from "@/features/prazos/types";
import { ApiError } from "@/lib/api/errors";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AssistenteIA, suggestionColor } from "./assistente-ia";

// TELA REAL — Construção de Peça (/pecas/[id]).
// Layout 3 colunas: Contexto (colapsável) | Editor (Peça/Anexos) | Assistente IA (casca).
// Dados vindos do GET /v1/pecas/:id; autosave via PATCH /v1/pecas/:id.
// Stepper: Construção (ativa) · Assinatura · Protocolo (cascas navegáveis).

const STEPS = ["Construção", "Assinatura", "Protocolo"] as const;
type Step = (typeof STEPS)[number];

const TOOLBAR_ICONS = [
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Link2,
];

// ── Componente público ───────────────────────────────────────────────────────

export function PecaDetalhe({ id }: { id: string }) {
  const { peca, isPending, isError, error } = usePeca(id);

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  const breadcrumb = useMemo(
    () => [
      { label: "Peticionamento", href: "/pecas" },
      {
        label: peca
          ? `Processo ${peca.process?.cnj_number ?? "—"}`
          : isPending
            ? "Carregando…"
            : "Peça",
      },
    ],
    [peca, isPending],
  );
  useSetBreadcrumb(breadcrumb);

  if (isPending) return <PecaDetalheSkeleton />;

  if (isError || !peca) {
    return (
      <div className="reveal flex flex-col gap-4">
        <h1 className="font-display text-2xl leading-none tracking-tight">
          {notFound ? "Peça não encontrada" : "Erro ao carregar"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {notFound
            ? "Ela pode ter sido removida ou o link está incorreto."
            : error instanceof ApiError
              ? error.message
              : "Tente novamente em instantes."}
        </p>
        <Link href="/pecas" className="text-gold text-sm hover:underline">
          Voltar para as peças
        </Link>
      </div>
    );
  }

  return <PecaDetalheReal id={id} peca={peca} />;
}

// ── Layout real da Construção ────────────────────────────────────────────────

function PecaDetalheReal({
  id,
  peca,
}: {
  id: string;
  peca: NonNullable<ReturnType<typeof usePeca>["peca"]>;
}) {
  const [step, setStep] = useState<Step>("Construção");
  const [ctxOpen, setCtxOpen] = useState(true);

  // Content levantado ao pai para que AssistenteIA possa aplicar sugestões
  // e o EditorCol possa re-renderizar com o novo content.
  const [content, setContent] = useState(peca.content ?? "");

  // Sincroniza o editor quando o servidor muda o texto por fora — ex.: a
  // geração/regeneração com IA popula draft.content de forma assíncrona e o
  // polling do usePeca traz o novo peca.content. useState só aplica o valor
  // inicial no mount, então SEM isto o editor ficaria vazio após a IA gerar a
  // minuta (bug: sugestões vinham mas o corpo não aparecia). Só adota o valor
  // do servidor se não houver edição local não salva (content local ainda
  // igual ao último valor conhecido do servidor, ou vazio) — nunca sobrescreve
  // o que o usuário está digitando.
  const lastServerContent = useRef(peca.content ?? "");
  useEffect(() => {
    const server = peca.content ?? "";
    if (server === lastServerContent.current) return;
    setContent((local) =>
      local === lastServerContent.current || local === "" ? server : local,
    );
    lastServerContent.current = server;
  }, [peca.content]);

  // Autosave compartilhado — chamado tanto pelo editor (onChange) quanto ao
  // aplicar sugestão.
  const { status, savedAt, scheduleAutosave } = useAutosavePeca(
    id,
    peca.content ?? "",
  );

  // Hover sync editor↔painel (pelo n da sugestão).
  const [activeSuggestionN, setActiveSuggestionN] = useState<number | null>(
    null,
  );

  const handleApplySuggestion = useCallback(
    (newContent: string) => {
      setContent(newContent);
      scheduleAutosave(newContent);
    },
    [scheduleAutosave],
  );

  return (
    <div className="reveal flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* TopBar: breadcrumb + stepper + ações */}
      <PecaTopBar peca={peca} step={step} onStep={setStep} />

      {/* Corpo */}
      {step === "Construção" ? (
        <div className="flex min-h-0 flex-1 gap-3 pt-3">
          {ctxOpen ? (
            <ContextoCol peca={peca} onCollapse={() => setCtxOpen(false)} />
          ) : null}
          <EditorCol
            id={id}
            peca={peca}
            ctxOpen={ctxOpen}
            onExpandCtx={() => setCtxOpen(true)}
            content={content}
            setContent={setContent}
            autosaveStatus={status}
            savedAt={savedAt}
            scheduleAutosave={scheduleAutosave}
            activeSuggestionN={activeSuggestionN}
            onActivateSuggestion={setActiveSuggestionN}
          />
          <AssistenteIA
            pecaId={id}
            peca={peca}
            content={content}
            onApplySuggestion={handleApplySuggestion}
            activeSuggestionN={activeSuggestionN}
            onActivateSuggestion={setActiveSuggestionN}
          />
        </div>
      ) : (
        <PlaceholderStep step={step} onBack={() => setStep("Construção")} />
      )}
    </div>
  );
}

// ── TopBar ───────────────────────────────────────────────────────────────────

function PecaTopBar({
  peca,
  step,
  onStep,
}: {
  peca: NonNullable<ReturnType<typeof usePeca>["peca"]>;
  step: Step;
  onStep: (s: Step) => void;
}) {
  return (
    <header className="bg-card/70 shrink-0 rounded-xl border px-5 py-3 backdrop-blur">
      {/* Breadcrumb */}
      <nav
        aria-label="Peticionamento"
        className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm"
      >
        <span>Peticionamento</span>
        <ChevronRight className="size-3.5 opacity-60" aria-hidden />
        <span className="text-foreground font-medium tabular-nums">
          Processo {peca.process?.cnj_number ?? "—"}
        </span>
      </nav>

      {/* Stepper */}
      <ol className="flex items-center gap-1">
        {STEPS.map((label, i) => {
          const active = label === step;
          const done = STEPS.indexOf(label) < STEPS.indexOf(step);
          return (
            <li key={label} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStep(label)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary"
                        : "border-muted-foreground/30 border",
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 ? (
                <span className="bg-border mx-1 h-px w-6" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </header>
  );
}

// ── Coluna Contexto ──────────────────────────────────────────────────────────

function ContextoCol({
  peca,
  onCollapse,
}: {
  peca: NonNullable<ReturnType<typeof usePeca>["peca"]>;
  onCollapse: () => void;
}) {
  const { intimation, process, deadline } = peca;

  const deadlineLabel = deadline
    ? prazoStatusLabel(deadline.status as PrazoStatus, deadline.days_left)
    : null;

  // O BE clampa days_left em 0 — nunca negativo; urgente = vence hoje/amanhã.
  const isUrgent = deadline && deadline.days_left <= 1;
  const isWarning = deadline && !isUrgent && deadline.days_left <= 3;

  return (
    <section
      aria-label="Contexto da peça"
      className="bg-card ring-foreground/10 flex w-64 shrink-0 flex-col rounded-xl shadow-sm ring-1"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-sm leading-none">Contexto da peça</h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Recolher contexto"
          className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 rounded-md p-1"
        >
          <PanelLeftClose className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {/* Tipo de peça */}
        <CtxField label="Tipo de peça">
          <span className="flex items-center gap-1.5">
            <FileText className="text-muted-foreground size-3.5" aria-hidden />
            {peca.piece_type || "—"}
          </span>
        </CtxField>

        {/* Intimação */}
        <CtxField label="Intimação">
          {intimation ? (
            <>
              <p className="text-primary text-sm font-medium">
                {intimation.type}
              </p>
              {intimation.content ? (
                <p className="text-muted-foreground mt-0.5 line-clamp-4 text-xs leading-relaxed">
                  {intimation.content}
                </p>
              ) : (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Sem teor disponível.
                </p>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </CtxField>

        {/* Prazo */}
        {deadline ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2",
              isUrgent
                ? "border-destructive/40 bg-destructive/[0.06]"
                : isWarning
                  ? "border-amber-500/40 bg-amber-500/[0.06]"
                  : "border-border bg-muted/30",
            )}
            role="status"
            aria-label={`Prazo: ${formatDate(deadline.end_date)}, ${daysLeftLabel(deadline.days_left)}`}
          >
            <Clock
              className={cn(
                "size-3.5 shrink-0",
                isUrgent
                  ? "text-destructive"
                  : isWarning
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
              aria-hidden
            />
            <div className="text-xs">
              <span className="text-muted-foreground">Prazo: </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  isUrgent
                    ? "text-destructive"
                    : isWarning
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground",
                )}
              >
                {formatDate(deadline.end_date)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                ({daysLeftLabel(deadline.days_left)})
              </span>
              {deadlineLabel ? (
                <span
                  className={cn(
                    "ml-1 font-medium",
                    isUrgent
                      ? "text-destructive"
                      : isWarning
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground",
                  )}
                >
                  · {deadlineLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <CtxField label="Prazo">
            <span className="text-muted-foreground">—</span>
          </CtxField>
        )}

        {/* Processo */}
        <CtxField label="Processo">
          <span className="tabular-nums">{process?.cnj_number ?? "—"}</span>
          {process?.class ? (
            <p className="text-muted-foreground text-xs">{process.class}</p>
          ) : null}
          {process?.subject ? (
            <p className="text-muted-foreground text-xs">{process.subject}</p>
          ) : null}
        </CtxField>

        {/* Órgão julgador */}
        <CtxField label="Órgão julgador">
          <span className="flex items-center gap-1.5">
            <Gavel className="text-muted-foreground size-3.5" aria-hidden />
            {process?.judging_body || "—"}
          </span>
        </CtxField>

        {/* Tribunal */}
        <CtxField label="Tribunal">
          <span className="flex items-center gap-1.5">
            <Building2 className="text-muted-foreground size-3.5" aria-hidden />
            {process?.court || "—"}
          </span>
        </CtxField>
      </div>
    </section>
  );
}

function CtxField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="text-foreground text-sm">{children}</div>
    </div>
  );
}

// ── Coluna Editor ────────────────────────────────────────────────────────────

type EditorTab = "peca" | "anexos";

function EditorCol({
  id,
  peca,
  ctxOpen,
  onExpandCtx,
  content,
  setContent,
  autosaveStatus: status,
  savedAt,
  scheduleAutosave,
  activeSuggestionN,
  onActivateSuggestion,
}: {
  id: string;
  peca: NonNullable<ReturnType<typeof usePeca>["peca"]>;
  ctxOpen: boolean;
  onExpandCtx: () => void;
  content: string;
  setContent: (c: string) => void;
  autosaveStatus: ReturnType<typeof useAutosavePeca>["status"];
  savedAt: Date | null;
  scheduleAutosave: (c: string) => void;
  activeSuggestionN: number | null;
  onActivateSuggestion: (n: number | null) => void;
}) {
  const [tab, setTab] = useState<EditorTab>("peca");
  const anexoCount = peca.attachments?.length ?? 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setContent(next);
      scheduleAutosave(next);
    },
    [setContent, scheduleAutosave],
  );

  const savedAtLabel = savedAt
    ? savedAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = content.length;

  // Sugestões pendentes (não ignoradas — a lógica de ignoradas está no AssistenteIA).
  // Aqui só precisamos de saber quais originais existem no content p/ SugBlock.
  const suggestions: PecaSuggestion[] = peca.review?.suggestions ?? [];

  return (
    <section
      aria-label="Editor da peça"
      className="bg-card ring-foreground/10 flex min-w-0 flex-1 flex-col rounded-xl shadow-sm ring-1"
    >
      {/* Aba header — botões custom (underline) sem depender do TabsList do DS */}
      <div
        role="tablist"
        aria-label="Abas do editor"
        className="flex items-center gap-1 border-b px-3"
      >
        {!ctxOpen ? (
          <button
            type="button"
            onClick={onExpandCtx}
            aria-label="Abrir contexto"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mr-1 flex size-7 items-center justify-center rounded-md"
          >
            <PanelLeftOpen className="size-4" aria-hidden />
          </button>
        ) : null}
        <EditorTabBtn active={tab === "peca"} onClick={() => setTab("peca")}>
          <FileText className="size-3.5" aria-hidden />
          Peça
        </EditorTabBtn>
        <EditorTabBtn
          active={tab === "anexos"}
          onClick={() => setTab("anexos")}
        >
          <Paperclip className="size-3.5" aria-hidden />
          Anexos
          <span
            className={cn(
              "rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums",
              tab === "anexos"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
            aria-label={`${anexoCount} anexo${anexoCount !== 1 ? "s" : ""}`}
          >
            {anexoCount}
          </span>
        </EditorTabBtn>
      </div>

      {/* Aba Peça */}
      {tab === "peca" ? (
        <>
          {/* Toolbar cosmética */}
          <div
            className="flex flex-wrap items-center gap-1 border-b px-3 py-2"
            aria-hidden
          >
            {TOOLBAR_ICONS.map((Icon, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                aria-hidden
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md"
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>

          {/* Autosave error banner */}
          {status === "error" ? (
            <div
              role="alert"
              aria-live="polite"
              className="bg-destructive/[0.06] text-destructive border-b px-4 py-2 text-xs"
            >
              Falha ao salvar — tentando novamente na próxima alteração.
            </div>
          ) : null}

          {/* Barra de sugestões no editor (quando há sugestões com match no content) */}
          {suggestions.length > 0 && (
            <SuggestionsEditorBar
              suggestions={suggestions}
              content={content}
              activeSuggestionN={activeSuggestionN}
              onActivate={onActivateSuggestion}
            />
          )}

          {/* Editor */}
          <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
            <label htmlFor="peca-content" className="sr-only">
              Conteúdo da peça
            </label>
            <Textarea
              id="peca-content"
              value={content}
              onChange={handleChange}
              placeholder="Comece a redigir a peça…"
              className="min-h-full resize-none border-none shadow-none outline-none focus-visible:border-none focus-visible:ring-0"
              aria-label="Conteúdo da peça"
            />
          </div>

          {/* Rodapé: contadores + autosave */}
          <div
            className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="tabular-nums">
              {wordCount} palavra{wordCount !== 1 ? "s" : ""} · {charCount}{" "}
              caractere{charCount !== 1 ? "s" : ""}
            </span>
            <span>
              {status === "saving"
                ? "Salvando…"
                : status === "saved" && savedAtLabel
                  ? `Salvo às ${savedAtLabel}`
                  : status === "error"
                    ? "Falha ao salvar"
                    : ""}
            </span>
          </div>
        </>
      ) : (
        <AnexosTab pecaId={id} anexos={peca.attachments ?? []} />
      )}
    </section>
  );
}

// ── Aba Anexos (real) ────────────────────────────────────────────────────────

/**
 * Mensagem de erro legível para falha de validação de tamanho.
 */
function erroTamanho(reason: "vazio" | "muito_grande", name: string): string {
  if (reason === "vazio") return `"${name}" está vazio e não pode ser enviado.`;
  return `"${name}" excede 50 MB e não pode ser enviado.`;
}

function AnexosTab({
  pecaId,
  anexos,
}: {
  pecaId: string;
  anexos: PecaAnexo[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    enviarAnexo,
    isUploading,
    uploadError,
    progress,
    reset: resetUpload,
  } = useUploadAnexo(pecaId);

  const categorizarMutation = useCategorizarAnexo(pecaId);
  const removerMutation = useRemoverAnexo(pecaId);
  const previsualizarMutation = usePrevisualizarAnexo();

  // Progresso diferido para não bloquear interações durante atualização de %
  const deferredProgress = useDeferredValue(progress);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const valid = validarTamanhoAnexo(file);
    if (!valid.ok) {
      setValidationError(erroTamanho(valid.reason, file.name));
      return;
    }
    setValidationError(null);
    resetUpload();
    enviarAnexo(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto flex max-w-[46rem] flex-col gap-4">
          <div>
            <h3 className="font-display text-lg leading-none">
              Documentos anexos
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Serão protocolados junto com a peça, na ordem abaixo.
            </p>
          </div>

          {/* Dropzone */}
          <div
            role="group"
            aria-label="Área de upload de anexos"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              aria-label="Selecionar arquivo para anexar"
              aria-describedby={
                validationError
                  ? "anexo-validation-error"
                  : uploadError
                    ? "anexo-upload-error"
                    : undefined
              }
              className={cn(
                "border-border hover:border-primary/40 hover:bg-primary/[0.02] flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
                isUploading && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full"
                aria-hidden
              >
                <FileUp className="size-5" />
              </span>
              <p className="text-sm font-medium">
                {isUploading
                  ? "Enviando…"
                  : "Arraste arquivos aqui ou clique para enviar"}
              </p>
              <p className="text-muted-foreground text-xs">
                PDF, imagens, DOCX — máximo 50 MB por arquivo
              </p>
            </button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Progresso de upload */}
          {isUploading && deferredProgress !== null ? (
            <div
              role="progressbar"
              aria-valuenow={deferredProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Enviando: ${deferredProgress}%`}
              className="flex flex-col gap-1.5"
            >
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${deferredProgress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-right text-xs tabular-nums">
                {deferredProgress}%
              </p>
            </div>
          ) : null}

          {/* Erro de validação */}
          {validationError ? (
            <p
              id="anexo-validation-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {validationError}
            </p>
          ) : null}

          {/* Erro de upload */}
          {uploadError ? (
            <div
              id="anexo-upload-error"
              role="alert"
              className="bg-destructive/[0.06] text-destructive border-destructive/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="flex-1">
                Falha ao enviar:{" "}
                {uploadError instanceof Error
                  ? uploadError.message
                  : "Tente novamente."}
              </span>
              <button
                type="button"
                onClick={() => {
                  resetUpload();
                  setValidationError(null);
                }}
                aria-label="Dispensar erro de upload"
                className="hover:bg-destructive/10 rounded-md p-1"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          ) : null}

          {/* Lista de anexos */}
          {anexos.length > 0 ? (
            <ul className="flex flex-col gap-2" aria-label="Anexos adicionados">
              {anexos.map((anexo, i) => (
                <AnexoItem
                  key={anexo.id}
                  index={i}
                  anexo={anexo}
                  onCategorizar={(categoria) =>
                    categorizarMutation.mutate({
                      attachmentId: anexo.id,
                      category: categoria,
                    })
                  }
                  onPrevisualizar={() =>
                    previsualizarMutation.mutate(anexo.document_id)
                  }
                  onRemover={() => removerMutation.mutate(anexo.id)}
                  isRemoving={removerMutation.isPending}
                  isPreviewing={previsualizarMutation.isPending}
                />
              ))}
            </ul>
          ) : !isUploading ? (
            <p className="text-muted-foreground text-center text-sm">
              Nenhum anexo adicionado ainda.
            </p>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Plus data-icon="inline-start" />
            Adicionar documento
          </Button>
        </div>
      </div>

      {/* Rodapé */}
      <div
        className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="tabular-nums">
          {isUploading
            ? "Enviando…"
            : `${anexos.length} documento${anexos.length !== 1 ? "s" : ""} anexado${anexos.length !== 1 ? "s" : ""}`}
        </span>
        <span>A IA usa estes anexos como fonte ao redigir a peça.</span>
      </div>
    </div>
  );
}

function AnexoItem({
  index,
  anexo,
  onCategorizar,
  onPrevisualizar,
  onRemover,
  isRemoving,
  isPreviewing,
}: {
  index: number;
  anexo: PecaAnexo;
  onCategorizar: (cat: AnexoCategoria) => void;
  onPrevisualizar: () => void;
  onRemover: () => void;
  isRemoving: boolean;
  isPreviewing: boolean;
}) {
  return (
    <li className="hover:bg-muted/30 flex items-center gap-3 rounded-xl border p-3 transition-colors">
      {/* Número de ordem */}
      <span
        className="text-muted-foreground w-4 shrink-0 text-center text-xs tabular-nums"
        aria-hidden
      >
        {index + 1}
      </span>

      {/* Ícone */}
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500"
        aria-hidden
      >
        <FileText className="size-4" />
      </span>

      {/* Nome + tamanho */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={anexo.name}>
          {anexo.name}
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatBytes(anexo.size_bytes)}
        </p>
      </div>

      {/* Select de categoria */}
      <label htmlFor={`categoria-${anexo.id}`} className="sr-only">
        Categoria do anexo {anexo.name}
      </label>
      <select
        id={`categoria-${anexo.id}`}
        value={anexo.category ?? "Outro"}
        onChange={(e) => onCategorizar(e.target.value as AnexoCategoria)}
        className="border-input bg-card text-foreground focus:ring-ring rounded-md border px-2 py-1 text-xs outline-none focus:ring-1"
      >
        {ANEXO_CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Pré-visualizar */}
      <button
        type="button"
        onClick={onPrevisualizar}
        disabled={isPreviewing}
        aria-label={`Pré-visualizar ${anexo.name} em nova aba`}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md disabled:opacity-50"
      >
        <Eye className="size-4" aria-hidden />
      </button>

      {/* Remover */}
      <button
        type="button"
        onClick={onRemover}
        disabled={isRemoving}
        aria-label={`Remover ${anexo.name}`}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-8 items-center justify-center rounded-md disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function EditorTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-2 py-3 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {children}
    </button>
  );
}

// ── Barra de sugestões no editor ─────────────────────────────────────────────
// O editor é um textarea plano (sem highlight inline). Esta barra conecta as
// sugestões ao texto: cada chip (número + cor da categoria) sincroniza o hover
// com o painel e, ao clicar, SELECIONA o trecho `original` no textarea (rola até
// ele). Só mostra sugestões cujo original ainda casa no content.

function SuggestionsEditorBar({
  suggestions,
  content,
  activeSuggestionN,
  onActivate,
}: {
  suggestions: PecaSuggestion[];
  content: string;
  activeSuggestionN: number | null;
  onActivate: (n: number | null) => void;
}) {
  const pending = suggestions.filter((s) => content.includes(s.original));
  if (pending.length === 0) return null;

  const selectOriginal = (original: string) => {
    const ta = document.getElementById("peca-content");
    if (!(ta instanceof HTMLTextAreaElement)) return;
    const idx = content.indexOf(original);
    if (idx < 0) return;
    ta.focus();
    ta.setSelectionRange(idx, idx + original.length);
  };

  return (
    <div className="bg-muted/20 flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
      <span className="text-muted-foreground mr-1 text-xs font-medium">
        {pending.length} sugest{pending.length !== 1 ? "ões" : "ão"} da IA:
      </span>
      {pending.map((s) => {
        const c = suggestionColor(s.category);
        const active = activeSuggestionN === s.n;
        return (
          <button
            key={s.n}
            type="button"
            onMouseEnter={() => onActivate(s.n)}
            onMouseLeave={() => onActivate(null)}
            onClick={() => selectOriginal(s.original)}
            aria-label={`Sugestão ${s.n}: ${s.category} — ir ao trecho no texto`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border py-0.5 pr-2 pl-0.5 text-xs transition-shadow",
              active ? c.ring : "border-transparent",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                c.num,
              )}
              aria-hidden
            >
              {s.n}
            </span>
            <span className="text-foreground">{s.category}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Placeholders das etapas casca ────────────────────────────────────────────

function PlaceholderStep({ step, onBack }: { step: Step; onBack: () => void }) {
  return (
    <div className="reveal mt-6 flex flex-col items-center gap-4">
      <div className="bg-card ring-foreground/10 flex max-w-md flex-col items-center gap-4 rounded-xl p-10 text-center shadow-sm ring-1">
        <Calendar
          className="text-muted-foreground size-10 opacity-40"
          aria-hidden
        />
        <h2 className="font-display text-xl leading-tight">
          Etapa {step} chega em breve
        </h2>
        <p className="text-muted-foreground text-sm">
          A etapa de {step.toLowerCase()} será implementada na próxima fatia.
        </p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft data-icon="inline-start" />
          Voltar à Construção
        </Button>
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PecaDetalheSkeleton() {
  return (
    <div className="reveal flex flex-col gap-4">
      <div className="bg-muted h-4 w-56 animate-pulse rounded" />
      <div className="bg-muted h-8 w-72 animate-pulse rounded" />
      <div className="bg-muted mt-2 h-9 w-80 animate-pulse rounded-lg" />
      <div className="bg-muted mt-2 h-96 w-full animate-pulse rounded-xl" />
    </div>
  );
}
