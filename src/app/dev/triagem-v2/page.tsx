"use client";

// Mockup — Triagem v2 (DENSA, bulk-first). Escritório recebe CENTENAS de
// intimações/dia, milhares em backlog. A tela é uma lista DENSA (idiom Gmail/
// Linear/Superhuman) onde o fluxo primário é EM LOTE: a maioria confiável é
// varrida de uma vez ("Confirmar N prazos"), e as exceções (a apurar) ficam
// óbvias pra revisão humana.
//
// Pipeline: A triar → Em andamento → Concluído. State 100% local (useState),
// rota dev, dados mockados. Sem BE, sem API.
//
// VISUAL: fontes/cores/mono da listagem REAL de /intimacoes (font-display serif
// no título, font-mono na metadata, tons de estado.ts, Badge/Button do DS).

import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  MoreHorizontal,
  PenLine,
  Search,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { tabTriggerClassName } from "@/components/ui/tab-styles";
import { cn } from "@/lib/utils";

/* ───────────────────────────── modelo de dados ──────────────────────────── */

type Lifecycle = "triar" | "andamento" | "concluido";
type Segment = "trabalhar" | "ciencia" | "sem-prazo";
/** Valores do TabBar de segmento — inclui os cortes transversais "excecoes" e "all". */
type SegTab = Segment | "all" | "excecoes";
type Categoria =
  "Recurso" | "Manifestação" | "Ciência" | "Despacho/Decisão" | "Intimação";
type WorkState = "agenda" | "elaboracao" | "revisao";
type Resolution = "ciente" | "protocolada" | "descartada" | "vencida";
/** confiança: confiável = pronto p/ bulk; a_apurar = exceção que precisa de humano. */
type Confianca = "confiavel" | "a_apurar";

interface Intimacao {
  id: string;
  categoria: Categoria;
  processoTitulo: string;
  cnj: string;
  tribunal: string;
  grau: string;
  autor: string;
  reu: string;
  teor: string;
  acao: string;
  geraPeca: boolean;
  prazoOffset: number | null; // dias vs HOJE; <0 vencido; null = sem prazo
  provisorio?: boolean;
  confianca: Confianca;
  /** motivo da exceção (quando a_apurar) — mostrado no chip/tooltip. */
  motivoExcecao?: string;
  responsavel: string | null;
  segment: Segment;
  lifecycle: Lifecycle;
  workState?: WorkState;
  resolution?: Resolution;
  resolvedLabel?: string;
  resolvedDate?: string;
}

/* ────────────────────────────── datas (helpers) ─────────────────────────── */

const TODAY = new Date("2026-09-22T12:00:00");

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function fmtFull(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type PrazoTone = "vencido" | "urgente" | "futuro";
function toneOf(offset: number | null): PrazoTone {
  if (offset === null) return "futuro";
  if (offset < 0) return "vencido";
  if (offset <= 6) return "urgente";
  return "futuro";
}
function shortRelative(offset: number): string {
  if (offset < 0) return `${Math.abs(offset)}d atraso`;
  if (offset === 0) return "hoje";
  if (offset === 1) return "1d";
  return `${offset}d`;
}

/* ─────────────── tons de estado (fonte: intimacoes/lib/estado.ts) ─────────── */

type EstadoTone = "pending" | "progress" | "done" | "muted";
const ESTADO_COR: Record<EstadoTone, string> = {
  pending: "var(--gold)",
  progress: "var(--blue)",
  done: "var(--green)",
  muted: "var(--fg3)",
};
function estadoFundo(tone: EstadoTone): string {
  return `color-mix(in oklch, ${ESTADO_COR[tone]} 12%, transparent)`;
}

/* ─────────────────────────── mock (volume ~40) ──────────────────────────── */

const RESPONSAVEIS = ["Carlos Teles", "Ana Beatriz Lima", "João Silva"];
/** O usuário logado do mock — usado em "Atribuir a mim" e no filtro "Minhas". */
const ME_NAME = "Carlos Teles";

// Componentes de sorteio determinístico (sem Math.random — mock estável).
const TITULOS: [Categoria, string, string, boolean][] = [
  [
    "Manifestação",
    "Execução de Título Extrajudicial · Nota Promissória",
    "Manifestar-se",
    true,
  ],
  [
    "Recurso",
    "Cumprimento de Sentença · Honorários",
    "Agravo de Instrumento",
    true,
  ],
  ["Manifestação", "Procedimento Comum Cível · Cobrança", "Contestação", true],
  [
    "Recurso",
    "Apelação Cível · Reforma de Sentença",
    "Contrarrazões de Apelação",
    true,
  ],
  [
    "Despacho/Decisão",
    "Ação Monitória · Cheque Prescrito",
    "Manifestar-se",
    true,
  ],
  [
    "Manifestação",
    "Busca e Apreensão · Alienação Fiduciária",
    "Emenda à Inicial",
    true,
  ],
  [
    "Recurso",
    "Cumprimento de Sentença · Danos Morais",
    "Embargos de Declaração",
    true,
  ],
  [
    "Manifestação",
    "Embargos à Execução · Excesso",
    "Impugnação aos Embargos",
    true,
  ],
  ["Manifestação", "Ação Declaratória · Inexigibilidade", "Réplica", true],
  [
    "Recurso",
    "Agravo de Instrumento · Tutela de Urgência",
    "Agravo de Instrumento",
    true,
  ],
];
const PARTES: [string, string][] = [
  ["José Aparecido de Oliveira", "Daniel Ferreira dos Santos"],
  ["Marcos Vinícius Tavares", "Construtora Horizonte Ltda."],
  ["Cooperativa de Crédito Sicoob", "Fernanda Ribeiro Alves"],
  ["Luiza Helena Prado", "Banco Santander S.A."],
  ["Auto Peças Central ME", "Rodrigo Antunes Mendes"],
  ["Banco Bradesco Financiamentos", "Patrícia Gomes de Souza"],
  ["Cláudia Marques Ferreira", "Telefônica Brasil S.A."],
  ["Distribuidora Nova Aliança", "Mercado São João EIRELI"],
  ["Tatiane Moreira Pinto", "Serasa Experian S.A."],
  ["Comércio Bandeirante ME", "Fazenda Pública do Estado"],
];
const FOROS = ["0100", "0002", "0224", "0011", "0451", "0577", "0006", "0090"];
const TEOR_TRAB =
  "Fica a parte intimada para se manifestar / apresentar a peça cabível no prazo legal, sob as penas da lei.";

function cnjFor(seq: number, foro: string): string {
  const n = String(1000000 + seq * 137).padStart(7, "0");
  return `${n}-${String((seq * 7) % 99).padStart(2, "0")}.2026.8.26.${foro}`;
}

function buildTriar(): Intimacao[] {
  const out: Intimacao[] = [];
  // Distribuição de vencimentos: muitos vencidos/hoje/semana + futuros.
  const offsets = [
    -8, -6, -5, -3, -3, -2, -1, -1, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 9,
    10, 12, 14, 18, 21, 28, -4, 2,
  ];
  // 30 "pra trabalhar"
  for (let k = 0; k < 30; k++) {
    const [cat, titulo, acao, geraPeca] = TITULOS[k % TITULOS.length];
    const [autor, reu] = PARTES[k % PARTES.length];
    const foro = FOROS[k % FOROS.length];
    const off = offsets[k];
    // exceções: provisório, sem-responsável, ou "IA inferida" (a cada ~3º)
    const provisorio = k % 9 === 4;
    const responsavel =
      k % 5 === 2 ? null : RESPONSAVEIS[k % RESPONSAVEIS.length];
    const iaInferida = k % 7 === 3;
    const divergente = k % 11 === 5;
    let confianca: Confianca = "confiavel";
    let motivo: string | undefined;
    if (provisorio) {
      confianca = "a_apurar";
      motivo = "Prazo provisório (piso supletivo) — confirmar a contagem.";
    } else if (iaInferida) {
      confianca = "a_apurar";
      motivo = "Tipo de ato inferido — revisar antes de confirmar.";
    } else if (divergente) {
      confianca = "a_apurar";
      motivo = "Divergência entre a publicação e o cálculo do prazo.";
    } else if (responsavel === null) {
      confianca = "a_apurar";
      motivo = "Sem responsável atribuído.";
    }
    out.push({
      id: `t${k}`,
      categoria: cat,
      processoTitulo: titulo,
      cnj: cnjFor(k, foro),
      tribunal: "TJSP",
      grau: cat === "Recurso" && k % 2 === 0 ? "2º Grau" : "1º Grau",
      autor,
      reu,
      teor: TEOR_TRAB,
      acao,
      geraPeca,
      prazoOffset: off,
      provisorio,
      confianca,
      motivoExcecao: motivo,
      responsavel,
      segment: "trabalhar",
      lifecycle: "triar",
    });
  }
  // 7 "ciências" (confiáveis por natureza — nada a peticionar)
  const ciencias: [Categoria, string, string, string][] = [
    [
      "Ciência",
      "Procedimento Comum · Homologação de Acordo",
      "Instituto Aprender S/S",
      "Renato Barbosa Lima",
    ],
    [
      "Ciência",
      "Execução Fiscal · IPTU",
      "Município de São Paulo",
      "Espólio de A. C. Ramos",
    ],
    [
      "Ciência",
      "Ação de Despejo · Falta de Pagamento",
      "Imobiliária Vista Alegre",
      "Sérgio Nogueira da Silva",
    ],
    [
      "Ciência",
      "Procedimento Comum · Improcedência",
      "Gustavo Henrique Dias",
      "Banco Itaú Unibanco",
    ],
    [
      "Ciência",
      "Execução · Arquivamento",
      "Metalúrgica Progresso",
      "Oficina do Zé ME",
    ],
    [
      "Ciência",
      "Cumprimento · Extinção",
      "Priscila Fontes Barreto",
      "Energia Paulista S.A.",
    ],
    [
      "Ciência",
      "Monitória · Trânsito em Julgado",
      "Studio Arquitetura",
      "Condomínio Mirante",
    ],
  ];
  ciencias.forEach((c, k) => {
    out.push({
      id: `ci${k}`,
      categoria: c[0],
      processoTitulo: c[1],
      cnj: cnjFor(40 + k, FOROS[k % FOROS.length]),
      tribunal: "TJSP",
      grau: "1º Grau",
      autor: c[2],
      reu: c[3],
      teor: "Ciência do ato — sem necessidade de manifestação da parte.",
      acao: "Ciência",
      geraPeca: false,
      prazoOffset: null,
      confianca: "confiavel",
      responsavel: k % 3 === 0 ? null : RESPONSAVEIS[k % RESPONSAVEIS.length],
      segment: "ciencia",
      lifecycle: "triar",
    });
  });
  // 3 "sem prazo" — exceções (prazo não identificado)
  const semPrazo: [string, string, string][] = [
    [
      "Ação de Obrigação de Fazer · Plano de Saúde",
      "Roberto Kenji Nakamura",
      "Amil Assistência Médica",
    ],
    [
      "Ação Civil · Audiência Designada",
      "Ministério Público",
      "Rede Comercial Sul Ltda.",
    ],
    [
      "Mandado de Segurança · Pauta",
      "Fábrica Têxtil Aurora",
      "Fazenda Estadual",
    ],
  ];
  semPrazo.forEach((s, k) => {
    out.push({
      id: `sp${k}`,
      categoria: "Intimação",
      processoTitulo: s[0],
      cnj: cnjFor(50 + k, FOROS[k % FOROS.length]),
      tribunal: "TJSP",
      grau: "1º Grau",
      autor: s[1],
      reu: s[2],
      teor: "Prazo de resposta não identificado automaticamente — requer triagem manual.",
      acao: "Definir prazo",
      geraPeca: false,
      prazoOffset: null,
      confianca: "a_apurar",
      motivoExcecao: "Prazo não identificado — definir tipo e prazo.",
      responsavel: null,
      segment: "sem-prazo",
      lifecycle: "triar",
    });
  });
  // Força alguns processos REPETIDOS (mesmo CNJ) p/ o "Agrupar por processo".
  if (out[2] && out[12]) out[12].cnj = out[2].cnj;
  if (out[2] && out[20]) out[20].cnj = out[2].cnj;
  if (out[5] && out[15]) out[15].cnj = out[5].cnj;
  return out;
}

function buildAndamento(): Intimacao[] {
  const base: [WorkState, string, string, string][] = [
    [
      "agenda",
      "Procedimento Comum · Indenização",
      "Contestação",
      "Carlos Teles",
    ],
    ["agenda", "Execução · Penhora", "Manifestar-se", "Ana Beatriz Lima"],
    [
      "elaboracao",
      "Apelação · Rescisão Contratual",
      "Contrarrazões de Apelação",
      "Ana Beatriz Lima",
    ],
    [
      "elaboracao",
      "Cumprimento · Alimentos",
      "Impugnação ao Cumprimento",
      "Carlos Teles",
    ],
    [
      "revisao",
      "Agravo · Tutela de Urgência",
      "Agravo de Instrumento",
      "Ana Beatriz Lima",
    ],
    ["revisao", "Declaratória · Inexigibilidade", "Réplica", "Carlos Teles"],
  ];
  return base.map((b, k) => ({
    id: `a${k}`,
    categoria:
      b[0] === "revisao" || b[1].includes("Agravo")
        ? "Recurso"
        : "Manifestação",
    processoTitulo: b[1],
    cnj: cnjFor(60 + k, FOROS[k % FOROS.length]),
    tribunal: "TJSP",
    grau:
      b[1].includes("Apelação") || b[1].includes("Agravo")
        ? "2º Grau"
        : "1º Grau",
    autor: PARTES[k][0],
    reu: PARTES[k][1],
    teor: "Peça em produção.",
    acao: b[2],
    geraPeca: true,
    prazoOffset: [6, 3, 2, 4, 1, 8][k],
    confianca: "confiavel",
    responsavel: b[3],
    segment: "trabalhar",
    lifecycle: "andamento",
    workState: b[0],
  }));
}

function buildConcluido(): Intimacao[] {
  const base: [Resolution, string, string, string][] = [
    [
      "ciente",
      "Procedimento Comum · Revisão de Contrato",
      "Ciência registrada",
      "18/09/2026",
    ],
    [
      "protocolada",
      "Apelação · Cobrança de Aluguéis",
      "Peça protocolada",
      "16/09/2026",
    ],
    ["descartada", "Execução · Duplicata", "Descartada", "15/09/2026"],
    [
      "vencida",
      "Procedimento Comum · Repetição de Indébito",
      "Prazo perdido",
      "11/09/2026",
    ],
    [
      "ciente",
      "Execução Fiscal · Arquivamento",
      "Ciência registrada",
      "10/09/2026",
    ],
    [
      "protocolada",
      "Cumprimento · Impugnação",
      "Peça protocolada",
      "09/09/2026",
    ],
  ];
  return base.map((b, k) => ({
    id: `c${k}`,
    categoria: k % 2 === 0 ? "Manifestação" : "Recurso",
    processoTitulo: b[1],
    cnj: cnjFor(70 + k, FOROS[k % FOROS.length]),
    tribunal: "TJSP",
    grau: "1º Grau",
    autor: PARTES[k][0],
    reu: PARTES[k][1],
    teor: "Encerrada.",
    acao: b[0] === "ciente" ? "Ciência" : "Peça",
    geraPeca: b[0] === "protocolada",
    prazoOffset: null,
    confianca: "confiavel",
    responsavel: k % 3 === 0 ? null : RESPONSAVEIS[k % RESPONSAVEIS.length],
    segment: b[0] === "ciente" ? "ciencia" : "trabalhar",
    lifecycle: "concluido",
    resolution: b[0],
    resolvedLabel: b[2],
    resolvedDate: b[3],
  }));
}

const SEED: Intimacao[] = [
  ...buildTriar(),
  ...buildAndamento(),
  ...buildConcluido(),
];

/* ───────────────────────── átomos de apresentação ───────────────────────── */

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/** Avatar compacto do responsável (20px) ou traço tracejado "sem responsável". */
function RespAvatar({ nome }: { nome: string | null }) {
  return (
    <span className="shrink-0" aria-hidden title={nome ?? "Sem responsável"}>
      {nome ? (
        <span className="bg-primary/12 text-primary grid size-5 place-items-center rounded-full text-[0.55rem] font-semibold">
          {initials(nome)}
        </span>
      ) : (
        <span className="border-line text-fg3 grid size-5 place-items-center rounded-full border border-dashed">
          <UserRound className="size-3" />
        </span>
      )}
    </span>
  );
}

/** Chip grosso da categoria — pequeno, neutro/outline. */
function CategoriaChip({ categoria }: { categoria: Categoria }) {
  return (
    <span className="border-border/80 bg-muted/50 text-muted-foreground shrink-0 rounded px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">
      {categoria}
    </span>
  );
}

/** Pill compacta de prazo — só data curta + relativo; cor por urgência. */
function PrazoPill({
  offset,
  provisorio,
}: {
  offset: number | null;
  provisorio?: boolean;
}) {
  if (offset === null) {
    return (
      <span className="text-fg3 inline-flex shrink-0 items-center gap-1 text-[11px]">
        <Clock className="size-3" aria-hidden />
        sem prazo
      </span>
    );
  }
  const tone = toneOf(offset);
  const cls =
    tone === "vencido"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "urgente"
        ? "border-gold/35 bg-gold/10 text-gold-foreground"
        : "border-border bg-transparent text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium tabular-nums",
        cls,
      )}
      title={`vence ${fmtFull(addDays(TODAY, offset))}`}
    >
      <Clock className="size-3" aria-hidden />
      {fmtShort(addDays(TODAY, offset))} · {shortRelative(offset)}
      {provisorio ? "*" : ""}
    </span>
  );
}

/** Marca de exceção — triângulo âmbar; tooltip com o motivo. */
function ExcecaoDot({ motivo }: { motivo?: string }) {
  return (
    <span
      className="text-gold-foreground inline-flex shrink-0 items-center"
      title={motivo ?? "Precisa de revisão"}
      aria-label={`Exceção: ${motivo ?? "precisa de revisão"}`}
    >
      <TriangleAlert className="size-3.5" aria-hidden />
    </span>
  );
}

function EstadoChip({ label, tone }: { label: string; tone: EstadoTone }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: ESTADO_COR[tone], backgroundColor: estadoFundo(tone) }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: ESTADO_COR[tone] }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/* ─────────────────────── toasts (fila efêmera local) ─────────────────────── */

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "info" | "danger";
}
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  function push(text: string, tone: Toast["tone"] = "ok") {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }
  return { toasts, push };
}
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="border-border bg-card animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm shadow-lg duration-200"
        >
          <span
            className={cn(
              "grid size-5 place-content-center rounded-full",
              t.tone === "ok" && "bg-primary/12 text-primary",
              t.tone === "info" && "bg-info/12 text-[color:var(--info)]",
              t.tone === "danger" && "bg-destructive/12 text-destructive",
            )}
          >
            <Check className="size-3.5" aria-hidden />
          </span>
          <span className="font-medium">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── dropdown minimalista (Popover-lite) ───────────────── */

function MenuDropdown({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          className={cn(
            "border-border bg-card animate-in fade-in zoom-in-95 absolute top-full z-40 mt-1 min-w-44 overflow-hidden rounded-lg border p-1 shadow-lg duration-100",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ──────────────────────── DENSE ROW — "A triar" ─────────────────────────── */

type Density = "confortavel" | "compacto";

function RowTriar({
  item,
  selected,
  density,
  onToggleSelect,
  onAction,
  onAssign,
}: {
  item: Intimacao;
  selected: boolean;
  density: Density;
  onToggleSelect: () => void;
  onAction: (kind: ExitKind, item: Intimacao) => void;
  onAssign: (id: string, nome: string | null) => void;
}) {
  const compact = density === "compacto";
  const primary =
    item.segment === "ciencia"
      ? {
          label: "Dar ciência",
          short: "Ciência",
          kind: "ciencia" as ExitKind,
          icon: CheckCheck,
        }
      : item.segment === "sem-prazo"
        ? {
            label: "Definir prazo",
            short: "Prazo",
            kind: "definir" as ExitKind,
            icon: CalendarDays,
          }
        : {
            label: "Confirmar prazo",
            short: "Confirmar",
            kind: "confirmar" as ExitKind,
            icon: Check,
          };
  const Primary = primary.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 sm:px-4",
        compact ? "py-1.5" : "py-2.5",
        selected ? "bg-primary/[0.05]" : "hover:bg-muted/30",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        aria-label={`Selecionar ${item.processoTitulo}`}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Linha 1: categoria · título · prazo */}
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={item.categoria} />
          {item.confianca === "a_apurar" && (
            <ExcecaoDot motivo={item.motivoExcecao} />
          )}
          <button
            type="button"
            title={item.teor}
            className="font-display text-foreground hover:text-primary min-w-0 truncate text-left text-[13.5px] leading-tight font-medium underline-offset-4 outline-none hover:underline"
          >
            {item.processoTitulo}
          </button>
          <span className="ml-auto shrink-0">
            <PrazoPill offset={item.prazoOffset} provisorio={item.provisorio} />
          </span>
        </div>

        {/* Linha 2: meta mono · ação */}
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-mono">
            {[item.cnj, item.tribunal, item.grau].join(" · ")}
          </span>
          <span className="text-fg3 shrink-0">·</span>
          <span className="text-foreground/70 shrink-0 truncate">
            {item.acao}
          </span>
          {item.geraPeca && item.segment === "trabalhar" && (
            <Badge variant="secondary" className="ml-0.5 hidden sm:inline-flex">
              gera peça
            </Badge>
          )}
        </div>
      </div>

      {/* Responsável (avatar clicável) — logo antes das ações */}
      <MenuDropdown
        align="end"
        trigger={
          <button
            type="button"
            className="hover:bg-muted shrink-0 rounded-full p-0.5 transition-colors"
            aria-label="Responsável"
          >
            <RespAvatar nome={item.responsavel} />
          </button>
        }
      >
        {(close) => (
          <>
            <p className="section-label px-2.5 py-1">Responsável</p>
            {RESPONSAVEIS.map((n) => (
              <MenuItem
                key={n}
                onClick={() => {
                  onAssign(item.id, n);
                  close();
                }}
              >
                <span className="bg-primary/12 text-primary grid size-5 place-content-center rounded-full text-[0.6rem] font-semibold">
                  {initials(n)}
                </span>
                {n}
              </MenuItem>
            ))}
            <MenuItem
              onClick={() => {
                onAssign(item.id, null);
                close();
              }}
            >
              <span className="border-line grid size-5 place-content-center rounded-full border border-dashed">
                <X className="size-3" aria-hidden />
              </span>
              Sem responsável
            </MenuItem>
          </>
        )}
      </MenuDropdown>

      {/* Ações inline — SEMPRE visíveis, compactas (icon-only no Compacto) */}
      <div className="flex shrink-0 items-center gap-1">
        {compact ? (
          <Button
            size="icon-sm"
            className="size-7"
            onClick={() => onAction(primary.kind, item)}
            aria-label={primary.label}
            title={primary.label}
          >
            <Primary />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 px-2.5"
            onClick={() => onAction(primary.kind, item)}
          >
            <Primary data-icon="inline-start" />
            {primary.short}
          </Button>
        )}

        {item.segment === "trabalhar" &&
          (compact ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="size-7"
              onClick={() => onAction("peca", item)}
              aria-label="Gerar peça"
              title="Gerar peça"
            >
              <PenLine />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5"
              onClick={() => onAction("peca", item)}
            >
              Peça
            </Button>
          ))}

        <MenuDropdown
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7"
              aria-label="Mais ações"
            >
              <MoreHorizontal />
            </Button>
          }
        >
          {(close) => (
            <>
              {item.segment !== "trabalhar" && (
                <MenuItem
                  onClick={() => {
                    onAction("peca", item);
                    close();
                  }}
                >
                  <PenLine className="size-4" aria-hidden />
                  Gerar peça
                </MenuItem>
              )}
              {item.segment !== "ciencia" && (
                <MenuItem
                  onClick={() => {
                    onAction("ciencia", item);
                    close();
                  }}
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Dar ciência
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  onAction("adiar", item);
                  close();
                }}
              >
                <Clock className="size-4" aria-hidden />
                Adiar
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onAssign(item.id, ME_NAME);
                  close();
                }}
              >
                <UserRound className="size-4" aria-hidden />
                Atribuir a mim
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  onAction("descartar", item);
                  close();
                }}
              >
                <X className="size-4" aria-hidden />
                Descartar
              </MenuItem>
            </>
          )}
        </MenuDropdown>
      </div>
    </div>
  );
}

/* ───────── grupo por processo (várias intimações do mesmo CNJ) ───────────── */

function GroupRow({
  cnj,
  itens,
  selected,
  density,
  onToggleSelect,
  onAction,
  onAssign,
}: {
  cnj: string;
  itens: Intimacao[];
  selected: Set<string>;
  density: Density;
  onToggleSelect: (id: string) => void;
  onAction: (kind: ExitKind, item: Intimacao) => void;
  onAssign: (id: string, nome: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const head = itens[0];
  const anyExcecao = itens.some((i) => i.confianca === "a_apurar");
  const compact = density === "compacto";
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "hover:bg-muted/30 flex w-full items-center gap-2.5 px-3 text-left sm:px-4",
          compact ? "py-1.5" : "py-2.5",
        )}
      >
        <ChevronRight
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {anyExcecao && <ExcecaoDot motivo="Contém exceções a apurar" />}
            <span className="font-display text-foreground min-w-0 truncate text-[13.5px] leading-tight font-medium">
              {head.processoTitulo}
            </span>
            <Badge variant="warning" className="ml-auto shrink-0">
              {itens.length} intimações
            </Badge>
          </div>
          <p className="text-muted-foreground min-w-0 truncate font-mono text-[11px]">
            {cnj} · {head.tribunal} · {head.grau}
          </p>
        </div>
      </button>
      {open && (
        <div className="border-border bg-muted/10 border-t">
          {itens.map((it) => (
            <div
              key={it.id}
              className="border-border border-b pl-6 last:border-b-0"
            >
              <RowTriar
                item={it}
                selected={selected.has(it.id)}
                density={density}
                onToggleSelect={() => onToggleSelect(it.id)}
                onAction={onAction}
                onAssign={onAssign}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── DENSE ROW — "Em andamento" ────────────────────── */

function RowAndamento({
  item,
  density,
}: {
  item: Intimacao;
  density: Density;
}) {
  const compact = density === "compacto";
  const meta: Record<WorkState, { label: string; tone: EstadoTone }> = {
    agenda: { label: "Na agenda", tone: "muted" },
    elaboracao: { label: "Em elaboração", tone: "progress" },
    revisao: { label: "Em revisão", tone: "progress" },
  };
  const st = meta[item.workState ?? "agenda"];
  return (
    <div
      className={cn(
        "hover:bg-muted/30 flex items-center gap-2.5 px-3 sm:px-4",
        compact ? "py-1.5" : "py-2.5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={item.categoria} />
          <span className="font-display text-foreground min-w-0 truncate text-[13.5px] leading-tight font-medium">
            {item.processoTitulo}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <PrazoPill offset={item.prazoOffset} />
            <RespAvatar nome={item.responsavel} />
          </span>
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-mono">
            {[item.cnj, item.tribunal, item.grau].join(" · ")}
          </span>
          <span className="text-fg3 shrink-0">·</span>
          <span className="shrink-0">{item.acao}</span>
          <span className="ml-1 shrink-0">
            <EstadoChip label={st.label} tone={st.tone} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── DENSE ROW — "Concluído" ───────────────────────── */

function RowConcluido({
  item,
  density,
}: {
  item: Intimacao;
  density: Density;
}) {
  const compact = density === "compacto";
  const danger = item.resolution === "vencida";
  const tone: EstadoTone = danger
    ? "pending"
    : item.resolution === "descartada"
      ? "muted"
      : "done";
  const label =
    item.resolution === "ciente"
      ? "Concluída · Ciência"
      : item.resolution === "protocolada"
        ? "Concluída · Protocolada"
        : item.resolution === "descartada"
          ? "Ignorada"
          : "Prazo perdido";
  return (
    <div
      className={cn(
        "hover:bg-muted/30 flex items-center gap-2.5 px-3 sm:px-4",
        compact ? "py-1.5" : "py-2.5",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <CategoriaChip categoria={item.categoria} />
          <span className="font-display text-muted-foreground min-w-0 truncate text-[13.5px] leading-tight font-medium">
            {item.processoTitulo}
          </span>
          <span className="ml-auto shrink-0">
            {danger ? (
              <span className="text-destructive bg-destructive/10 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
                <span
                  className="bg-destructive size-1.5 rounded-full"
                  aria-hidden
                />
                {label}
              </span>
            ) : (
              <EstadoChip label={label} tone={tone} />
            )}
          </span>
        </div>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
          <span className="min-w-0 truncate font-mono">
            {[item.cnj, item.tribunal, item.grau].join(" · ")}
          </span>
          <span className="text-fg3 shrink-0">·</span>
          <span
            className={cn("shrink-0", danger ? "text-destructive" : "text-fg3")}
          >
            {item.resolvedLabel} · {item.resolvedDate}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── barra de bulk ──────────────────────────────── */

function BulkBar({
  count,
  onBulk,
  onClear,
}: {
  count: number;
  onBulk: (kind: ExitKind) => void;
  onClear: () => void;
}) {
  return (
    <div className="sticky top-2 z-30">
      <div className="border-primary/30 bg-card/95 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          {count} selecionada{count === 1 ? "" : "s"}
        </span>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button size="sm" variant="outline" onClick={() => onBulk("ciencia")}>
          <CheckCheck data-icon="inline-start" />
          Dar ciência
        </Button>
        <Button size="sm" variant="outline" onClick={() => onBulk("confirmar")}>
          <Check data-icon="inline-start" />
          Confirmar prazos
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onBulk("responsavel")}
        >
          <UserRound data-icon="inline-start" />
          Definir responsável
        </Button>
        <Button size="sm" variant="outline" onClick={() => onBulk("adiar")}>
          <Clock data-icon="inline-start" />
          Adiar
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
          <X data-icon="inline-start" />
          Limpar
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────── faixa de abas (idiom FilterTabs) ──────────────────── */

interface TabDef<T extends string> {
  key: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** destaca o tab (âmbar/gold) — usado no "Exceções". */
  emphasis?: boolean;
}

function TabBar<T extends string>({
  label,
  tabs,
  value,
  onSelect,
  titlePrefix,
}: {
  label: string;
  tabs: TabDef<T>[];
  value: T;
  onSelect: (key: T) => void;
  titlePrefix?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-line flex min-w-0 items-center gap-1 overflow-x-auto border-b"
    >
      {titlePrefix ? (
        <span className="text-muted-foreground mr-2 shrink-0 text-xs font-medium">
          {titlePrefix}
        </span>
      ) : null}
      {tabs.map((t) => {
        const active = value === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(t.key)}
            className={cn(
              tabTriggerClassName(active),
              active && (t.emphasis ? "border-gold" : "border-primary"),
              // realce âmbar do tab de exceções — destaca-o dos neutros
              t.emphasis &&
                (active
                  ? "text-gold-foreground"
                  : "text-gold-foreground/80 hover:text-gold-foreground"),
            )}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {t.label}
            {t.count != null && t.count > 0 ? (
              <span
                className={cn(
                  "font-mono text-[10.5px] tabular-nums",
                  t.emphasis
                    ? "text-gold-foreground/90"
                    : active
                      ? "text-fg2"
                      : "text-fg3",
                )}
              >
                {t.count.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── interações ──────────────────────────────── */

type ExitKind =
  | "confirmar"
  | "peca"
  | "ciencia"
  | "definir"
  | "adiar"
  | "descartar"
  | "responsavel";

const EXIT_TARGET: Record<
  ExitKind,
  {
    lifecycle: Lifecycle;
    workState?: WorkState;
    resolution?: Resolution;
  } | null
> = {
  confirmar: { lifecycle: "andamento", workState: "agenda" },
  definir: { lifecycle: "andamento", workState: "agenda" },
  peca: { lifecycle: "andamento", workState: "elaboracao" },
  ciencia: { lifecycle: "concluido", resolution: "ciente" },
  descartar: { lifecycle: "concluido", resolution: "descartada" },
  adiar: null,
  responsavel: null,
};

const EXIT_TOAST: Record<ExitKind, { text: string; tone: Toast["tone"] }> = {
  confirmar: { text: "Prazo confirmado — na agenda", tone: "ok" },
  definir: { text: "Prazo definido — na agenda", tone: "ok" },
  peca: { text: "Peça iniciada — em elaboração", tone: "info" },
  ciencia: { text: "Ciência registrada", tone: "ok" },
  descartar: { text: "Intimação descartada", tone: "danger" },
  adiar: { text: "Adiada por 3 dias", tone: "info" },
  responsavel: { text: "Responsável definido", tone: "ok" },
};

/* ───────────────────────────────── página ───────────────────────────────── */

const VENC_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "vencidos", label: "Vencidos" },
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mês" },
] as const;
type VencKey = (typeof VENC_FILTERS)[number]["key"];

function quantidade(n: number, singular: string, plural: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : plural}`;
}

// Contadores "de fachada" pro header parecer volume real (backlog de centenas).
const BACKLOG_INTIMACOES = 347;
const BACKLOG_PROCESSOS = 210;

export default function Page() {
  const [items, setItems] = useState<Intimacao[]>(SEED);
  const [tab, setTab] = useState<Lifecycle>("triar");
  // "excecoes" é o segmento DEFAULT — o humano cai no que precisa dele.
  const [segment, setSegment] = useState<SegTab>("excecoes");
  const [venc, setVenc] = useState<VencKey>("todas");
  const [respFilter, setRespFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [resFilter, setResFilter] = useState<Resolution | "all">("all");
  const [grouped, setGrouped] = useState(false);
  const [density, setDensity] = useState<Density>("confortavel");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const { toasts, push } = useToasts();

  const ME = ME_NAME;

  /* ── contagens ── */
  const triarAll = useMemo(
    () => items.filter((i) => i.lifecycle === "triar"),
    [items],
  );
  const counts = useMemo(
    () => ({
      triar: triarAll.length,
      andamento: items.filter((i) => i.lifecycle === "andamento").length,
      concluido: items.filter((i) => i.lifecycle === "concluido").length,
    }),
    [items, triarAll],
  );
  const segCounts = useMemo(
    () => ({
      trabalhar: triarAll.filter((i) => i.segment === "trabalhar").length,
      ciencia: triarAll.filter((i) => i.segment === "ciencia").length,
      "sem-prazo": triarAll.filter((i) => i.segment === "sem-prazo").length,
    }),
    [triarAll],
  );
  const excecoesCount = useMemo(
    () => triarAll.filter((i) => i.confianca === "a_apurar").length,
    [triarAll],
  );

  /* ── filtros ── */
  function passesVenc(i: Intimacao): boolean {
    if (venc === "todas") return true;
    if (i.prazoOffset === null) return false;
    if (venc === "vencidos") return i.prazoOffset < 0;
    if (venc === "hoje") return i.prazoOffset === 0;
    if (venc === "semana") return i.prazoOffset >= 0 && i.prazoOffset <= 6;
    if (venc === "mes") return i.prazoOffset >= 0 && i.prazoOffset <= 30;
    return true;
  }
  function passesResp(i: Intimacao): boolean {
    if (respFilter === "all") return true;
    if (respFilter === "mine") return i.responsavel === ME;
    if (respFilter === "none") return i.responsavel === null;
    return i.responsavel === respFilter;
  }
  function passesQuery(i: Intimacao): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      i.cnj.toLowerCase().includes(q) ||
      i.autor.toLowerCase().includes(q) ||
      i.reu.toLowerCase().includes(q) ||
      i.processoTitulo.toLowerCase().includes(q)
    );
  }

  function passesSegment(i: Intimacao): boolean {
    if (segment === "all") return true;
    if (segment === "excecoes") return i.confianca === "a_apurar";
    return i.segment === segment;
  }

  const triarFiltered = triarAll.filter(
    (i) => passesSegment(i) && passesVenc(i) && passesResp(i) && passesQuery(i),
  );

  // Varredura em lote: os confiáveis do recorte atual (o "majority one-click").
  const sweepable = triarFiltered.filter((i) => i.confianca === "confiavel");
  const sweepKind: ExitKind | null =
    segment === "ciencia"
      ? "ciencia"
      : segment === "trabalhar"
        ? "confirmar"
        : segment === "all"
          ? "confirmar"
          : null;

  // Agrupamento por processo (CNJ).
  const groups = useMemo(() => {
    const map = new Map<string, Intimacao[]>();
    for (const it of triarFiltered) {
      const arr = map.get(it.cnj) ?? [];
      arr.push(it);
      map.set(it.cnj, arr);
    }
    return Array.from(map.entries());
  }, [triarFiltered]);

  const andamento = items.filter((i) => i.lifecycle === "andamento");
  const andamentoGroups: { key: WorkState; label: string }[] = [
    { key: "agenda", label: "Na agenda" },
    { key: "elaboracao", label: "Em elaboração" },
    { key: "revisao", label: "Em revisão" },
  ];

  const concluido = items
    .filter((i) => i.lifecycle === "concluido")
    .filter((i) => resFilter === "all" || i.resolution === resFilter);

  /* ── mutações ── */
  function applyExit(ids: string[], kind: ExitKind) {
    const target = EXIT_TARGET[kind];
    setExiting((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setItems((prev) =>
        prev.map((i) => {
          if (!ids.includes(i.id)) return i;
          if (kind === "adiar") {
            return {
              ...i,
              prazoOffset: i.prazoOffset === null ? null : i.prazoOffset + 3,
            };
          }
          if (kind === "responsavel")
            return { ...i, responsavel: ME, confianca: "confiavel" };
          if (!target) return i;
          return {
            ...i,
            lifecycle: target.lifecycle,
            workState: target.workState,
            resolution: target.resolution,
            resolvedLabel:
              target.resolution === "ciente"
                ? "Ciência registrada"
                : target.resolution === "descartada"
                  ? "Descartada"
                  : undefined,
            resolvedDate:
              target.resolution !== undefined ? fmtFull(TODAY) : undefined,
          };
        }),
      );
      setExiting((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
      setSelected((prev) => {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      });
    }, 240);
    const t = EXIT_TOAST[kind];
    push(ids.length > 1 ? `${t.text} · ${ids.length} itens` : t.text, t.tone);
  }

  function onAction(kind: ExitKind, item: Intimacao) {
    applyExit([item.id], kind);
  }
  function onAssign(id: string, nome: string | null) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              responsavel: nome,
              confianca: nome ? "confiavel" : i.confianca,
            }
          : i,
      ),
    );
    push(nome ? `Responsável: ${nome}` : "Responsável removido", "ok");
  }

  /* ── seleção ── */
  const visibleIds = triarFiltered.map((i) => i.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleSelectAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const n = new Set(prev);
        visibleIds.forEach((id) => n.delete(id));
        return n;
      }
      return new Set([...prev, ...visibleIds]);
    });
  }
  const selectedCount = visibleIds.filter((id) => selected.has(id)).length;

  const vencLabel =
    VENC_FILTERS.find((f) => f.key === venc)?.label ?? "Urgência";

  const sweepLabel =
    segment === "ciencia"
      ? `Dar ciência em ${sweepable.length}`
      : `Confirmar ${sweepable.length} ${sweepable.length === 1 ? "prazo confiável" : "prazos confiáveis"}`;

  return (
    <div className="bg-background mx-auto flex w-full max-w-5xl flex-col px-3 py-4 sm:px-4">
      <ToastStack toasts={toasts} />

      {/* header — "Triagem" + contagem de VOLUME (backlog) */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-3">
        <h1 className="shrink-0 text-[13px] font-medium">Triagem</h1>
        <span className="text-fg3 min-w-0 truncate font-mono text-[11px]">
          {quantidade(BACKLOG_INTIMACOES, "intimação", "intimações")} ·{" "}
          {quantidade(BACKLOG_PROCESSOS, "processo", "processos")}
        </span>
      </div>

      {/* tabs de ciclo de vida */}
      <TabBar
        label="Ciclo de vida"
        value={tab}
        onSelect={setTab}
        tabs={[
          { key: "triar", label: "A triar", count: counts.triar },
          { key: "andamento", label: "Em andamento", count: counts.andamento },
          { key: "concluido", label: "Concluído", count: counts.concluido },
        ]}
      />

      {/* ───────────────── A TRIAR ───────────────── */}
      {tab === "triar" && (
        <div className="flex flex-col gap-3 py-3">
          {/* toolbar: busca + Filtrar + Urgência + Responsável + densidade */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por CNJ, partes ou assunto…"
                aria-label="Buscar intimações"
                className="h-8 pl-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8">
              <Filter data-icon="inline-start" />
              Filtrar
            </Button>
            <MenuDropdown
              align="end"
              trigger={
                <Button variant="outline" size="sm" className="h-8">
                  <CalendarDays data-icon="inline-start" />
                  {venc === "todas" ? "Urgência" : vencLabel}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              }
            >
              {(close) => (
                <>
                  <p className="section-label px-2.5 py-1">Vencimento</p>
                  {VENC_FILTERS.map((f) => (
                    <MenuItem
                      key={f.key}
                      onClick={() => {
                        setVenc(f.key);
                        close();
                      }}
                    >
                      {venc === f.key ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : (
                        <span className="size-3.5" />
                      )}
                      {f.label}
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuDropdown>
            <MenuDropdown
              align="end"
              trigger={
                <Button variant="outline" size="sm" className="h-8">
                  <UserRound data-icon="inline-start" />
                  {respFilter === "all"
                    ? "Responsável"
                    : respFilter === "mine"
                      ? "Minhas"
                      : respFilter === "none"
                        ? "Sem responsável"
                        : respFilter}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              }
            >
              {(close) => (
                <>
                  {[
                    { k: "all", label: "Todas" },
                    { k: "mine", label: "Minhas" },
                    { k: "none", label: "Sem responsável" },
                    ...RESPONSAVEIS.map((n) => ({ k: n, label: n })),
                  ].map((o) => (
                    <MenuItem
                      key={o.k}
                      onClick={() => {
                        setRespFilter(o.k);
                        close();
                      }}
                    >
                      {respFilter === o.k ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : (
                        <span className="size-3.5" />
                      )}
                      {o.label}
                    </MenuItem>
                  ))}
                </>
              )}
            </MenuDropdown>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                aria-pressed={grouped}
                onClick={() => setGrouped((g) => !g)}
                className={cn(
                  "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                  grouped
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                Agrupar por processo
              </button>
              <button
                type="button"
                onClick={() =>
                  setDensity((d) =>
                    d === "compacto" ? "confortavel" : "compacto",
                  )
                }
                title="Alternar densidade"
                className="border-border text-muted-foreground hover:text-foreground h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors"
              >
                {density === "compacto" ? "Compacto" : "Confortável"}
              </button>
            </div>
          </div>

          {/* segmentos — "Exceções" promovido a TAB (primeiro, destaque âmbar) */}
          <TabBar
            label="Fila de trabalho"
            value={segment}
            onSelect={(k) => setSegment(k)}
            tabs={[
              {
                key: "excecoes",
                label: "Exceções",
                count: excecoesCount,
                icon: TriangleAlert,
                emphasis: true,
              },
              { key: "all", label: "Tudo", count: triarAll.length },
              {
                key: "trabalhar",
                label: "Pra trabalhar",
                count: segCounts.trabalhar,
              },
              { key: "ciencia", label: "Ciências", count: segCounts.ciencia },
              {
                key: "sem-prazo",
                label: "Sem prazo",
                count: segCounts["sem-prazo"],
              },
            ]}
          />

          {/* header do segmento Exceções — revise cada uma (sem sweep) */}
          {segment === "excecoes" && triarFiltered.length > 0 && (
            <div className="border-gold/25 bg-gold/8 text-gold-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              <span className="font-medium">
                {triarFiltered.length}{" "}
                {triarFiltered.length === 1 ? "exceção" : "exceções"} — revise
                cada uma.
              </span>
              <span className="text-gold-foreground/80 text-xs">
                Prazo provisório, tipo inferido, divergência ou sem responsável.
              </span>
            </div>
          )}

          {/* VARREDURA EM LOTE — a ação headline (não aparece em Exceções) */}
          {sweepKind && sweepable.length > 0 && (
            <div className="border-primary/25 bg-primary/[0.06] flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5">
              <CheckCheck
                className="text-primary size-5 shrink-0"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {sweepable.length} deste recorte estão confiáveis e prontas.
                </p>
                <p className="text-muted-foreground text-xs">
                  As {excecoesCount} exceções ficam de fora — revise-as à parte.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  applyExit(
                    sweepable.map((i) => i.id),
                    sweepKind,
                  )
                }
              >
                <Check data-icon="inline-start" />
                {sweepLabel}
              </Button>
            </div>
          )}

          {/* barra de bulk (seleção manual) */}
          {selectedCount > 0 && (
            <BulkBar
              count={selectedCount}
              onBulk={(kind) =>
                applyExit(
                  visibleIds.filter((id) => selected.has(id)),
                  kind,
                )
              }
              onClear={() => setSelected(new Set())}
            />
          )}

          {/* barra-mestra: select-all + contagem + banner Gmail-style */}
          {triarFiltered.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-muted-foreground flex items-center gap-2 pl-1 text-xs">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAllVisible}
                  aria-label="Selecionar todas visíveis"
                />
                <span>
                  Exibindo{" "}
                  {quantidade(triarFiltered.length, "intimação", "intimações")}{" "}
                  deste recorte.
                </span>
              </div>
              {allVisibleSelected && (
                <div className="border-gold/25 bg-gold/8 text-gold-foreground flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-xs">
                  As {visibleIds.length} deste recorte estão selecionadas.
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(new Set(triarAll.map((i) => i.id)))
                    }
                    className="font-semibold underline underline-offset-2"
                  >
                    Selecionar todas as {BACKLOG_INTIMACOES} do backlog
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LISTA DENSA */}
          {triarFiltered.length === 0 ? (
            <div className="border-border bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border px-6 py-14 text-center text-sm shadow-sm">
              <CheckCheck className="text-primary size-8" aria-hidden />
              {segment === "excecoes"
                ? "Nenhuma exceção neste recorte — tudo confiável."
                : "Nenhuma intimação neste recorte — inbox zero."}
            </div>
          ) : grouped ? (
            <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
              <div className="divide-border divide-y">
                {groups.map(([cnj, itens]) =>
                  itens.length === 1 ? (
                    <div
                      key={cnj}
                      className={cn(
                        "transition-all duration-300",
                        exiting.has(itens[0].id)
                          ? "translate-x-4 opacity-0"
                          : "opacity-100",
                      )}
                    >
                      <RowTriar
                        item={itens[0]}
                        selected={selected.has(itens[0].id)}
                        density={density}
                        onToggleSelect={() => toggleSelect(itens[0].id)}
                        onAction={onAction}
                        onAssign={onAssign}
                      />
                    </div>
                  ) : (
                    <GroupRow
                      key={cnj}
                      cnj={cnj}
                      itens={itens}
                      selected={selected}
                      density={density}
                      onToggleSelect={toggleSelect}
                      onAction={onAction}
                      onAssign={onAssign}
                    />
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
              <div className="divide-border divide-y">
                {triarFiltered.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "transition-all duration-300",
                      exiting.has(item.id)
                        ? "translate-x-4 opacity-0"
                        : "opacity-100",
                    )}
                  >
                    <RowTriar
                      item={item}
                      selected={selected.has(item.id)}
                      density={density}
                      onToggleSelect={() => toggleSelect(item.id)}
                      onAction={onAction}
                      onAssign={onAssign}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────── EM ANDAMENTO ───────────────── */}
      {tab === "andamento" && (
        <div className="flex flex-col gap-5 py-3">
          {andamento.length === 0 ? (
            <div className="border-border bg-card text-muted-foreground rounded-xl border px-6 py-14 text-center text-sm shadow-sm">
              Nada em andamento no momento.
            </div>
          ) : (
            andamentoGroups.map((g) => {
              const group = andamento.filter((i) => i.workState === g.key);
              if (group.length === 0) return null;
              return (
                <section key={g.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-4 w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,var(--primary),var(--gold))]"
                    />
                    <h2 className="font-display text-sm font-medium tracking-tight">
                      {g.label}
                    </h2>
                    <span className="text-fg3 font-mono text-[10.5px] tabular-nums">
                      {group.length}
                    </span>
                  </div>
                  <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
                    <div className="divide-border divide-y">
                      {group.map((item) => (
                        <RowAndamento
                          key={item.id}
                          item={item}
                          density={density}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ───────────────── CONCLUÍDO ───────────────── */}
      {tab === "concluido" && (
        <div className="flex flex-col gap-3 py-3">
          <TabBar
            label="Desfecho"
            titlePrefix="Desfecho"
            value={resFilter}
            onSelect={setResFilter}
            tabs={[
              { key: "all", label: "Todas" },
              { key: "ciente", label: "Ciente" },
              { key: "protocolada", label: "Protocolada" },
              { key: "descartada", label: "Descartada" },
              { key: "vencida", label: "Vencida" },
            ]}
          />

          {concluido.length === 0 ? (
            <div className="border-border bg-card text-muted-foreground rounded-xl border px-6 py-14 text-center text-sm shadow-sm">
              Nenhum registro com esse desfecho.
            </div>
          ) : (
            <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
              <div className="divide-border divide-y">
                {concluido.map((item) => (
                  <RowConcluido key={item.id} item={item} density={density} />
                ))}
              </div>
            </div>
          )}

          <p className="text-fg3 text-xs">
            O log da triagem — dupla persistência. É aqui que as intimações
            pousam depois de resolvidas.
          </p>
        </div>
      )}
    </div>
  );
}
