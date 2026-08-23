"use client";

import { Download, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useExportPeca,
  useFilePeca,
  usePeca,
  useSalvarRascunho,
  useSignPeca,
  useUpdateResult,
} from "@/features/pecas/hooks/use-peca";
import { cn } from "@/lib/utils";

import { AssistentePanel } from "./assistente-panel";
import { EditorToolbar } from "./editor-toolbar";
import { PecaContexto, PecaTopBar } from "./peca-shell";
import { type PassoPeca } from "./stepper-peca";

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
      <PecaTopBar
        peca={peca}
        passo={passo}
        onSetPasso={handleSetPasso}
        actions={
          <>
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
          </>
        }
      />

      {passo === 1 && (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(560px,1fr)_330px]">
          <PecaContexto peca={peca} />

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
