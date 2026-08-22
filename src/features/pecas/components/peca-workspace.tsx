"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { usePeca, useSalvarRascunho } from "@/features/pecas/hooks/use-peca";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { formatClaimValueBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { AssistentePanel } from "./assistente-panel";
import { EditorToolbar } from "./editor-toolbar";
import { type PassoPeca, StepperPeca } from "./stepper-peca";

// Rótulo legível do tipo de peça (piece_type do BE) para o cabeçalho do Contexto.
const TIPO_PECA_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  APPEAL: "Recurso",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

function rotuloTipoPeca(pieceType: string): string {
  return TIPO_PECA_LABEL[pieceType] ?? "Peça";
}

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
  const { save, isSaving, lastSavedAt } = useSalvarRascunho(id);
  const [passo, setPasso] = useState<PassoPeca>(1);

  // Contagem viva do editor — semeada do content real, atualizada a cada tecla.
  const [contagem, setContagem] = useState({ palavras: 0, caracteres: 0 });
  // Tick para reavaliar o "salvo há …" sem depender de nova digitação.
  const [, setTick] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const semeado = useRef(false);

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
        <StepperPeca atual={passo} onIr={setPasso} />
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
                    {intim.type}
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
                  valor={formatClaimValueBRL(proc.claim_value)}
                />

                <Rotulo className="mt-6">Partes</Rotulo>
                <CampoEmpilhado rotulo="Autor" valores={proc.plaintiffs} />
                <CampoEmpilhado rotulo="Réu" valores={proc.defendants} />
              </>
            )}

            <Rotulo className="mt-6">Anexos</Rotulo>
            <div className="flex flex-col gap-2">
              {peca.attachments.length === 0 ? (
                <p className="text-muted-foreground text-[11.5px]">
                  Nenhum documento anexado.
                </p>
              ) : (
                peca.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="border-border truncate rounded-lg border px-2 py-1.5 text-xs"
                  >
                    {a.name}
                  </div>
                ))
              )}
            </div>
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

          <AssistentePanel />
        </div>
      )}

      {passo === 2 && <EmBreve titulo="Assinatura" />}
      {passo === 3 && <EmBreve titulo="Protocolo" />}
    </div>
  );
}

// Passos 2/3 (assinatura, protocolo) são sub-epics de outras frentes — placeholder
// honesto até serem ligados ao BE, sem simular fluxo com dado falso.
function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto w-full max-w-220 px-8 py-8">
      <h1 className="font-display text-[34px] font-normal">{titulo}</h1>
      <p className="text-muted-foreground mt-2 text-[13.5px]">
        Esta etapa entra em uma próxima atualização.
      </p>
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
