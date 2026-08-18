"use client";

import {
  AlignLeft,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Bold,
  Brain,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CornerDownLeft,
  Download,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  Gavel,
  History,
  Italic,
  LayoutDashboard,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Trash2,
  Underline,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Protótipo do peticionamento com IA — tela "Construção" (Construção + Revisão na
// mesma página). Editor central com abas "Peça | Anexos (N)": os anexos vivem na
// própria etapa de construção (o advogado referencia docs no corpo e a IA os usa
// como fonte). Assistente IA conversacional (chat + raciocínio que cita o trecho
// dos autos = grounding) + sugestões color-coded: cada sugestão tem UMA COR e
// destaca no editor o trecho exato que substitui (destaques BEM SUAVES); hover
// sincroniza sugestão↔trecho; "Aplicar" troca o trecho. DS "Ledger" (verde=ação
// humana, dourado=IA, Fraunces nos títulos). Dados fictícios, sem IA/API real.

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Scale, label: "Processos" },
  { icon: Gavel, label: "Intimações", badge: "24" },
  { icon: Clock, label: "Prazos", badge: "18" },
  { icon: ListChecks, label: "Tarefas", badge: "32" },
  { icon: FileText, label: "Peças", badge: "14", active: true },
  { icon: FolderOpen, label: "Documentos" },
  { icon: Settings, label: "Configurações" },
];

const STEPS = ["Construção da peça", "Assinatura", "Protocolo"];

type Cor = "sky" | "amber" | "rose" | "violet";

const COR: Record<
  Cor,
  {
    num: string;
    mark: string;
    markActive: string;
    ring: string;
    box: string;
    text: string;
  }
> = {
  sky: {
    num: "bg-sky-500 text-white",
    mark: "bg-sky-400/[0.08]",
    markActive: "bg-sky-400/[0.16] ring-1 ring-sky-500/25",
    ring: "ring-1 ring-sky-500/30",
    box: "border-sky-500/20 bg-sky-500/[0.04]",
    text: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    num: "bg-amber-500 text-white",
    mark: "bg-amber-400/[0.10]",
    markActive: "bg-amber-400/[0.18] ring-1 ring-amber-500/25",
    ring: "ring-1 ring-amber-500/30",
    box: "border-amber-500/20 bg-amber-500/[0.05]",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    num: "bg-rose-500 text-white",
    mark: "bg-rose-400/[0.08]",
    markActive: "bg-rose-400/[0.16] ring-1 ring-rose-500/25",
    ring: "ring-1 ring-rose-500/30",
    box: "border-rose-500/20 bg-rose-500/[0.04]",
    text: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    num: "bg-violet-500 text-white",
    mark: "bg-violet-400/[0.08]",
    markActive: "bg-violet-400/[0.16] ring-1 ring-violet-500/25",
    ring: "ring-1 ring-violet-500/30",
    box: "border-violet-500/20 bg-violet-500/[0.04]",
    text: "text-violet-600 dark:text-violet-400",
  },
};

interface Sugestao {
  id: string;
  n: number;
  cat: string;
  cor: Cor;
  paragrafo: string;
  problema: string;
  sugestao: string;
  original: string;
  replacement: string;
}

const SUGESTOES: Sugestao[] = [
  {
    id: "s1",
    n: 1,
    cat: "Clareza",
    cor: "sky",
    paragrafo: "Parágrafo 1",
    problema: "A frase está muito longa e pode dificultar a compreensão.",
    sugestao: "Dividir a frase para tornar o texto mais claro e direto.",
    original:
      "EMPRESA ABC LTDA., já qualificada nos autos da Ação de Cobrança que move em face da EMPRESA XYZ LTDA., vem, respeitosamente, à presença de Vossa Excelência, em atenção à intimação de ID 12548, manifestar-se sobre os documentos apresentados pela parte ré.",
    replacement:
      "EMPRESA ABC LTDA., já qualificada nos autos, vem manifestar-se sobre os documentos apresentados pela parte ré, em atenção à intimação de ID 12548.",
  },
  {
    id: "s2",
    n: 2,
    cat: "Argumento",
    cor: "amber",
    paragrafo: "Parágrafo 2",
    problema: "O argumento pode ser mais forte com fundamentação legal.",
    sugestao:
      "Incluir referência ao art. 373, I, do CPC para reforçar o ônus da prova do pagamento.",
    original:
      "Todavia, conforme se demonstrará a seguir, os documentos juntados não são suficientes para afastar a obrigação assumida, tampouco comprovam o pagamento das parcelas.",
    replacement:
      "Todavia, os documentos juntados não afastam a obrigação assumida nem comprovam o pagamento das parcelas — ônus que, nos termos do art. 373, I, do CPC, recai sobre a parte ré.",
  },
  {
    id: "s3",
    n: 3,
    cat: "Coerência",
    cor: "rose",
    paragrafo: "Parágrafo 3",
    problema: "A afirmação pode gerar interpretação ambígua.",
    sugestao: "Especificar quais documentos são insuficientes e por quê.",
    original:
      "A parte ré juntou aos autos supostos comprovantes de pagamento e um contrato social, alegando que tais documentos seriam suficientes para comprovar a quitação integral do débito.",
    replacement:
      "A parte ré juntou supostos comprovantes de pagamento e um contrato social; contudo, tais documentos não identificam o favorecido nem o título a que se referem, sendo insuficientes para comprovar a quitação integral do débito.",
  },
  {
    id: "s4",
    n: 4,
    cat: "Estilo",
    cor: "violet",
    paragrafo: "Parágrafo 4",
    problema: "A redação pode ser mais objetiva.",
    sugestao: "Tornar a frase mais direta e eliminar expressões redundantes.",
    original:
      "Entretanto, os documentos apresentados não possuem eficácia jurídica para comprovar o adimplemento da obrigação, conforme se passa a demonstrar.",
    replacement:
      "Entretanto, tais documentos não comprovam o adimplemento da obrigação, conforme se demonstrará.",
  },
];

type Status = "pending" | "applied" | "ignored";

interface Anexo {
  id: string;
  name: string;
  categoria: string;
  tamanho: string;
}

const CATEGORIAS = [
  "Procuração",
  "Comprovante de endereço",
  "Contrato",
  "Provas documentais",
  "Declaração de hipossuficiência",
  "Outro",
];

const ANEXOS_INICIAIS: Anexo[] = [
  {
    id: "a1",
    name: "Procuração.pdf",
    categoria: "Procuração",
    tamanho: "245 KB",
  },
  {
    id: "a2",
    name: "Contrato_social.pdf",
    categoria: "Contrato",
    tamanho: "312 KB",
  },
  {
    id: "a3",
    name: "Comprovante.pdf",
    categoria: "Comprovante de endereço",
    tamanho: "156 KB",
  },
];

type EditorTab = "peca" | "anexos";

export default function ConstrucaoDaPecaMock() {
  const [step, setStep] = useState(1);
  const [protocolado, setProtocolado] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(true);
  const [tab, setTab] = useState<EditorTab>("peca");
  const [anexos, setAnexos] = useState<Anexo[]>(ANEXOS_INICIAIS);
  const [status, setStatus] = useState<Record<string, Status>>({
    s1: "pending",
    s2: "pending",
    s3: "pending",
    s4: "pending",
  });
  const [active, setActive] = useState<string | null>(null);

  const setOne = (id: string, s: Status) =>
    setStatus((prev) => ({ ...prev, [id]: s }));
  const sugById = Object.fromEntries(SUGESTOES.map((s) => [s.id, s]));
  const pendentes = SUGESTOES.filter((s) => status[s.id] === "pending");

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          step={step}
          protocolado={protocolado}
          onStep={setStep}
          onEnviar={() => setProtocolado(true)}
        />

        {step === 1 ? (
          <div className="flex min-h-0 flex-1 gap-4 p-4">
            {ctxOpen ? (
              <ContextoPecaCol
                onCollapse={() => setCtxOpen(false)}
                anexosCount={anexos.length}
                onOpenAnexos={() => setTab("anexos")}
              />
            ) : null}
            <EditorCol
              ctxOpen={ctxOpen}
              onExpandCtx={() => setCtxOpen(true)}
              tab={tab}
              setTab={setTab}
              anexos={anexos}
              setAnexos={setAnexos}
              sugById={sugById}
              status={status}
              active={active}
              setActive={setActive}
            />
            <AssistenteIACol
              pendentes={pendentes}
              status={status}
              active={active}
              setActive={setActive}
              onApply={(id) => setOne(id, "applied")}
              onIgnore={(id) => setOne(id, "ignored")}
            />
          </div>
        ) : step === 2 ? (
          <AssinaturaView anexos={anexos} />
        ) : (
          <ProtocoloView anexos={anexos} protocolado={protocolado} />
        )}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="bg-foreground text-background/80 flex w-56 shrink-0 flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="bg-background/10 text-background flex size-8 items-center justify-center rounded-lg">
          <Scale className="size-4" />
        </span>
        <span className="font-display text-background text-lg leading-none tracking-tight">
          LEXIA
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                item.active
                  ? "bg-background/10 text-background font-medium"
                  : "hover:bg-background/5 hover:text-background",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="bg-gold/80 text-gold-foreground rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-background/10 flex items-center gap-3 border-t px-5 py-4">
        <span className="relative flex size-8 items-center justify-center">
          <span className="bg-gold/80 text-gold-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            JS
          </span>
          <span className="border-foreground absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 bg-emerald-500" />
        </span>
        <div className="min-w-0">
          <p className="text-background truncate text-sm font-medium">
            João Silva
          </p>
          <p className="text-background/50 text-xs">Advogado</p>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  step,
  protocolado,
  onStep,
  onEnviar,
}: {
  step: number;
  protocolado: boolean;
  onStep: (n: number) => void;
  onEnviar: () => void;
}) {
  return (
    <header className="bg-card/70 shrink-0 border-b px-6 backdrop-blur">
      <div className="flex items-center gap-2 pt-3 text-sm">
        <span className="text-muted-foreground">Peticionamento</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-muted-foreground">Processo</span>
        <span className="font-medium tabular-nums">
          5001234-56.2026.8.13.0001
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 py-3">
        <ol className="flex items-center gap-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step || (n === 3 && protocolado);
            return (
              <li key={label} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onStep(n)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
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
                  >
                    {done ? <Check className="size-3" /> : n}
                  </span>
                  {label}
                </button>
                {n < STEPS.length ? (
                  <span className="bg-border mx-1 h-px w-6" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" size="sm">
                Salvar rascunho
              </Button>
              <Button size="sm" onClick={() => onStep(2)}>
                Ir para assinatura
                <CornerDownLeft data-icon="inline-end" className="size-3.5" />
              </Button>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onStep(1)}>
                <ArrowLeft data-icon="inline-start" className="size-3.5" />
                Voltar
              </Button>
              <Button size="sm" onClick={() => onStep(3)}>
                <BadgeCheck data-icon="inline-start" className="size-3.5" />
                Assinar e continuar
              </Button>
            </>
          ) : null}
          {step === 3 && !protocolado ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onStep(2)}>
                <ArrowLeft data-icon="inline-start" className="size-3.5" />
                Voltar
              </Button>
              <Button size="sm" onClick={onEnviar}>
                <Send data-icon="inline-start" className="size-3.5" />
                Enviar protocolo
              </Button>
            </>
          ) : null}
          {step === 3 && protocolado ? (
            <Button variant="outline" size="sm">
              Ir para o processo
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ContextoPecaCol({
  onCollapse,
  anexosCount,
  onOpenAnexos,
}: {
  onCollapse: () => void;
  anexosCount: number;
  onOpenAnexos: () => void;
}) {
  return (
    <section className="bg-card ring-foreground/10 flex w-64 shrink-0 flex-col rounded-xl shadow-sm ring-1">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-sm leading-none">Contexto da peça</h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Recolher contexto"
          className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 rounded-md p-1"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <Meta label="Tipo de peça">Manifestação sobre documentos</Meta>
        <Meta label="Intimação relacionada">
          <span className="text-primary font-medium">INT-1254B</span>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Manifestar sobre documentos apresentados pela parte ré.
          </p>
        </Meta>
        <div className="border-gold/30 bg-gold/[0.06] flex items-center gap-2 rounded-lg border px-3 py-2">
          <Clock className="text-gold size-3.5 shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">Prazo: </span>
            <span className="text-gold font-medium tabular-nums">
              15/08/2026
            </span>
            <span className="text-muted-foreground"> (3 dias)</span>
          </div>
        </div>
        <Meta label="Processo">
          <span className="tabular-nums">5001234-56.2026.8.13.0001</span>
          <p className="text-muted-foreground text-xs">Ação de Cobrança</p>
        </Meta>
        <Meta label="Órgão julgador">10ª Vara Cível de Belo Horizonte</Meta>
        <Meta label="Partes">
          <div className="flex flex-col gap-1.5">
            <div>
              <span className="text-muted-foreground text-xs">Autor</span>
              <p>Empresa ABC Ltda.</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Réu</span>
              <p>Empresa XYZ Ltda.</p>
            </div>
          </div>
        </Meta>
        <Meta label="Responsável">
          <span className="flex items-center gap-1.5">
            <Users className="text-muted-foreground size-3.5" />
            João Silva
          </span>
        </Meta>

        <button
          type="button"
          onClick={onOpenAnexos}
          className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
        >
          <span className="flex items-center gap-2">
            <Paperclip className="text-muted-foreground size-3.5" />
            Anexos
          </span>
          <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {anexosCount}
          </span>
        </button>
      </div>
    </section>
  );
}

function Meta({
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

const TOOLBAR = [
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Link2,
];

function EditorCol({
  ctxOpen,
  onExpandCtx,
  tab,
  setTab,
  anexos,
  setAnexos,
  sugById,
  status,
  active,
  setActive,
}: {
  ctxOpen: boolean;
  onExpandCtx: () => void;
  tab: EditorTab;
  setTab: (t: EditorTab) => void;
  anexos: Anexo[];
  setAnexos: React.Dispatch<React.SetStateAction<Anexo[]>>;
  sugById: Record<string, Sugestao>;
  status: Record<string, Status>;
  active: string | null;
  setActive: (id: string | null) => void;
}) {
  return (
    <section className="bg-card ring-foreground/10 flex min-w-0 flex-1 flex-col rounded-xl shadow-sm ring-1">
      {/* Abas Peça / Anexos */}
      <div className="flex items-center gap-1 border-b px-3">
        {!ctxOpen ? (
          <button
            type="button"
            onClick={onExpandCtx}
            aria-label="Abrir contexto"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mr-1 flex size-7 items-center justify-center rounded-md"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        ) : null}
        <EditorTabBtn active={tab === "peca"} onClick={() => setTab("peca")}>
          <FileText className="size-3.5" />
          Peça
        </EditorTabBtn>
        <EditorTabBtn
          active={tab === "anexos"}
          onClick={() => setTab("anexos")}
        >
          <Paperclip className="size-3.5" />
          Anexos
          <span
            className={cn(
              "rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums",
              tab === "anexos"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {anexos.length}
          </span>
        </EditorTabBtn>
      </div>

      {tab === "peca" ? (
        <PecaView
          sugById={sugById}
          status={status}
          active={active}
          setActive={setActive}
        />
      ) : (
        <AnexosView anexos={anexos} setAnexos={setAnexos} />
      )}
    </section>
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

function PecaView({
  sugById,
  status,
  active,
  setActive,
}: {
  sugById: Record<string, Sugestao>;
  status: Record<string, Status>;
  active: string | null;
  setActive: (id: string | null) => void;
}) {
  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
        <button
          type="button"
          className="hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-xs"
        >
          Normal
          <ChevronDown className="size-3" />
        </button>
        <span className="bg-border mx-1 h-4 w-px" />
        {TOOLBAR.map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-xs"
          >
            <Plus className="size-3" />
            Inserir
          </button>
          <button
            type="button"
            className="bg-gold/15 text-gold border-gold/30 flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
          >
            <Sparkles className="size-3" />
            IA
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs"
          >
            <History className="size-3" />
            Histórico
          </button>
        </div>
      </div>

      {/* Documento */}
      <div className="min-h-0 flex-1 overflow-auto px-8 py-8">
        <div className="mx-auto flex max-w-[46rem] flex-col gap-4 text-[0.95rem] leading-relaxed">
          <Block gutter>
            <p className="font-semibold">
              EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 10ª VARA CÍVEL DA
              COMARCA DE BELO HORIZONTE – MG
            </p>
          </Block>
          <Block gutter>
            <span className="border-primary/30 bg-primary/[0.05] inline-block rounded border px-2 py-1 text-xs tabular-nums">
              Processo nº 5001234-56.2026.8.13.0001
            </span>
          </Block>

          <SugBlock
            sug={sugById.s1}
            status={status.s1}
            active={active === "s1"}
            setActive={setActive}
          >
            {(text) => (
              <p>
                <strong>EMPRESA ABC LTDA.</strong>
                {text.replace("EMPRESA ABC LTDA.,", ",")}
              </p>
            )}
          </SugBlock>

          <Block gutter>
            <p className="font-semibold">I. SÍNTESE</p>
          </Block>
          <Block gutter>
            <p>
              A parte ré apresentou documentos que, em síntese, pretendem
              demonstrar a inexistência do débito alegado na petição inicial.
            </p>
          </Block>

          <SugBlock
            sug={sugById.s2}
            status={status.s2}
            active={active === "s2"}
            setActive={setActive}
          >
            {(text) => <p>{text}</p>}
          </SugBlock>

          <Block gutter>
            <p className="font-semibold">
              II. DOS DOCUMENTOS APRESENTADOS PELA PARTE RÉ
            </p>
          </Block>

          <SugBlock
            sug={sugById.s3}
            status={status.s3}
            active={active === "s3"}
            setActive={setActive}
          >
            {(text) => <p>{text}</p>}
          </SugBlock>

          <SugBlock
            sug={sugById.s4}
            status={status.s4}
            active={active === "s4"}
            setActive={setActive}
          >
            {(text) => <p>{text}</p>}
          </SugBlock>

          <Block gutter>
            <p className="font-medium">
              II.1. Da ausência de comprovação válida de pagamento
            </p>
          </Block>
          <Block gutter>
            <p>
              Os comprovantes juntados não possuem autenticação bancária, nem
              identificação do favorecido, tampouco indicação precisa do título
              ao qual se referem.
            </p>
          </Block>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
        <span className="tabular-nums">
          Palavras: 1.246 &nbsp;·&nbsp; Caracteres: 8.842
        </span>
        <span>Salvo automaticamente às 15:42</span>
        <span className="tabular-nums">100%</span>
      </div>
    </>
  );
}

function AnexosView({
  anexos,
  setAnexos,
}: {
  anexos: Anexo[];
  setAnexos: React.Dispatch<React.SetStateAction<Anexo[]>>;
}) {
  const add = () =>
    setAnexos((prev) => [
      ...prev,
      {
        id: `n${prev.length}-${Date.now()}`,
        name: "Novo_documento.pdf",
        categoria: "Outro",
        tamanho: "— KB",
      },
    ]);
  const remove = (id: string) =>
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  const setCat = (id: string, categoria: string) =>
    setAnexos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, categoria } : a)),
    );

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-8 py-8">
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
          <button
            type="button"
            onClick={add}
            className="border-border hover:border-primary/40 hover:bg-primary/[0.02] flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <FileUp className="size-5" />
            </span>
            <p className="text-sm font-medium">
              Arraste arquivos aqui ou clique para enviar
            </p>
            <p className="text-muted-foreground text-xs">
              PDF, imagens, DOCX — qualquer formato e tamanho
            </p>
          </button>

          {/* Lista */}
          <ul className="flex flex-col gap-2">
            {anexos.map((a, i) => (
              <li
                key={a.id}
                className="hover:bg-muted/30 flex items-center gap-3 rounded-xl border p-3 transition-colors"
              >
                <span className="text-muted-foreground w-4 shrink-0 text-center text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {a.tamanho}
                  </p>
                </div>
                <select
                  value={a.categoria}
                  onChange={(e) => setCat(a.id, e.target.value)}
                  aria-label="Categoria do documento"
                  className="border-input bg-card text-foreground rounded-md border px-2 py-1 text-xs outline-none"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Pré-visualizar"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
                >
                  <Eye className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Remover"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-8 items-center justify-center rounded-md"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>

          <Button variant="outline" size="sm" className="w-full" onClick={add}>
            <Plus data-icon="inline-start" />
            Adicionar documento
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
        <span className="tabular-nums">
          {anexos.length} documentos anexados
        </span>
        <span>
          A IA usa estes anexos como fonte ao redigir e citar os autos.
        </span>
      </div>
    </>
  );
}

function Block({
  children,
  gutter,
}: {
  children: React.ReactNode;
  gutter?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {gutter ? <span className="w-5 shrink-0" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SugBlock({
  sug,
  status,
  active,
  setActive,
  children,
}: {
  sug: Sugestao;
  status: Status;
  active: boolean;
  setActive: (id: string | null) => void;
  children: (text: string) => React.ReactNode;
}) {
  const c = COR[sug.cor];
  const applied = status === "applied";
  const ignored = status === "ignored";
  const text = applied ? sug.replacement : sug.original;

  return (
    <div className="flex items-start gap-3">
      <span className="flex w-5 shrink-0 justify-center pt-1">
        {status === "pending" ? (
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold shadow-sm transition-transform",
              c.num,
              active && "scale-110",
            )}
          >
            {sug.n}
          </span>
        ) : applied ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3" />
          </span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        {ignored ? (
          <div>{children(text)}</div>
        ) : (
          <div
            onMouseEnter={() => setActive(sug.id)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "-mx-1.5 cursor-pointer rounded-md px-1.5 py-0.5 transition-colors",
              applied
                ? "bg-emerald-500/[0.06]"
                : cn(c.mark, active && c.markActive),
            )}
          >
            {children(text)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assistente IA (conversacional + sugestões color-coded) ──────────────────

function AssistenteIACol({
  pendentes,
  status,
  active,
  setActive,
  onApply,
  onIgnore,
}: {
  pendentes: Sugestao[];
  status: Record<string, Status>;
  active: string | null;
  setActive: (id: string | null) => void;
  onApply: (id: string) => void;
  onIgnore: (id: string) => void;
}) {
  return (
    <section className="bg-card ring-foreground/10 flex w-96 shrink-0 flex-col rounded-xl shadow-sm ring-1">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="bg-gold/15 text-gold flex size-6 items-center justify-center rounded-md">
            <Sparkles className="size-3.5" />
          </span>
          <h2 className="font-display text-sm leading-none">Assistente IA</h2>
        </div>
        <span className="text-muted-foreground text-xs">
          Peça · manifestação
        </span>
      </div>

      {/* Conversa */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Li a intimação e os autos, e escrevi um primeiro rascunho da
          manifestação. Encontrei{" "}
          <span className="text-foreground font-medium">
            {pendentes.length} pontos
          </span>{" "}
          pra fortalecê-la — cada um aponta pro trecho no texto:
        </p>

        <div className="flex flex-col gap-2.5">
          {SUGESTOES.map((s) => (
            <SugCard
              key={s.id}
              sug={s}
              status={status[s.id]}
              active={active === s.id}
              onEnter={() => setActive(s.id)}
              onLeave={() => setActive(null)}
              onApply={() => onApply(s.id)}
              onIgnore={() => onIgnore(s.id)}
            />
          ))}
        </div>

        {/* Pergunta com raciocínio + citação dos autos (grounding) */}
        <div className="border-t pt-5">
          <div className="bg-muted/50 rounded-2xl px-4 py-3 text-sm font-medium">
            Esta peça precisa juntar o contrato de prestação de serviços?
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <TraceLine icon={Brain}>
              Analisando o pedido do despacho e a tese da inicial.
            </TraceLine>
            <TraceLine
              icon={Search}
              cite="Contrato_social.pdf · Petição inicial · fls. 1-10"
            >
              Procurando menções ao contrato nos autos.
            </TraceLine>
            <div className="flex gap-2.5">
              <span className="text-muted-foreground mt-1.5 flex size-4 shrink-0 items-center justify-center">
                <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Encontrei a origem da obrigação no contrato juntado à inicial.
                </p>
                <blockquote className="border-border bg-muted/30 text-muted-foreground mt-2 rounded-lg border-l-2 px-3 py-2 text-xs leading-relaxed italic">
                  &ldquo;…as parcelas decorrem do Contrato de Prestação de
                  Serviços firmado em 03/2024, juntado às fls. 4…&rdquo;
                </blockquote>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm leading-relaxed">
            <p>
              Sim. Como a ré impugna a existência do débito, convém rejuntar o
              contrato (fls. 4) e referenciá-lo na Seção II — é o que ancora a
              origem da obrigação. Já deixei isso como a sugestão{" "}
              <span className="font-medium">&ldquo;Coerência&rdquo;</span>.
            </p>
          </div>

          <div className="text-muted-foreground mt-3 flex items-center gap-1">
            <IconBtn icon={Copy} label="Copiar" />
            <IconBtn icon={RotateCcw} label="Refazer" />
            <IconBtn icon={Plus} label="Inserir no texto" />
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="border-t p-3">
        <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex items-end gap-2 rounded-xl border px-3 py-2 shadow-xs transition-colors focus-within:ring-3">
          <textarea
            rows={1}
            placeholder="Pergunte à IA sobre a peça…"
            className="text-foreground placeholder:text-muted-foreground/70 max-h-32 flex-1 resize-none bg-transparent py-1 text-sm outline-none"
          />
          <button
            type="button"
            aria-label="Enviar"
            className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SugCard({
  sug,
  status,
  active,
  onEnter,
  onLeave,
  onApply,
  onIgnore,
}: {
  sug: Sugestao;
  status: Status;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onApply: () => void;
  onIgnore: () => void;
}) {
  const c = COR[sug.cor];
  const applied = status === "applied";
  const ignored = status === "ignored";

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "rounded-xl border p-3 transition-shadow",
        active && !applied && !ignored && c.ring,
        ignored && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold",
              applied ? "bg-emerald-500 text-white" : c.num,
            )}
          >
            {applied ? <Check className="size-3" /> : sug.n}
          </span>
          <span className="text-sm font-medium">{sug.cat}</span>
        </div>
        <span className="text-muted-foreground text-xs">{sug.paragrafo}</span>
      </div>

      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {sug.problema}
      </p>

      {!ignored ? (
        <div
          className={cn(
            "mt-2.5 rounded-lg border px-3 py-2 text-sm leading-relaxed",
            c.box,
          )}
        >
          {sug.sugestao}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        {applied ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" />
            Aplicada ao texto
          </span>
        ) : ignored ? (
          <span className="text-muted-foreground text-xs">Ignorada</span>
        ) : (
          <>
            <Button size="xs" onClick={onApply}>
              Aplicar
            </Button>
            <Button size="xs" variant="ghost" onClick={onIgnore}>
              Ignorar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TraceLine({
  icon: Icon,
  cite,
  children,
}: {
  icon: React.ElementType;
  cite?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </p>
        {cite ? (
          <span className="border-border bg-muted/40 text-muted-foreground mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
            <FileText className="size-3" />
            {cite}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

// ── Etapa 2 · Assinatura ────────────────────────────────────────────────────

function AssinaturaView({ anexos }: { anexos: Anexo[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-1 pb-5">
        <h1 className="font-display text-2xl leading-none tracking-tight">
          Assinatura
        </h1>
        <p className="text-muted-foreground text-sm">
          Confira a peça e os anexos, e assine com seu certificado digital.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard title="Peça principal">
            <div className="flex items-center gap-3">
              <FileBadge />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  Manifestação sobre documentos.pdf
                </p>
                <p className="text-muted-foreground text-xs">
                  120,4 KB ·{" "}
                  <span className="text-gold font-medium">Gerado com IA</span>
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Eye data-icon="inline-start" className="size-3.5" />
                Visualizar
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={`Documentos anexos (${anexos.length})`} noPad>
            <ul className="divide-y">
              {anexos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <FileBadge sm />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {a.categoria} · {a.tamanho}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" />
                    Pronto
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-4">
          <SectionCard title="Certificado digital">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">JOÃO SILVA</p>
                  <p className="text-muted-foreground text-xs">
                    OAB/MG 100.000
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground text-xs">
                Tipo A1 · Validade 15/03/2027
              </div>
              <button
                type="button"
                className="text-primary self-start text-xs font-medium hover:underline"
              >
                Trocar certificado
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Assinaturas necessárias" noPad>
            <ul className="divide-y">
              <li className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">João Silva</p>
                  <p className="text-muted-foreground text-xs">
                    Advogado · assinatura digital
                  </p>
                </div>
                <span className="border-gold/40 bg-gold/[0.08] text-gold rounded-full border px-2 py-0.5 text-xs font-medium">
                  Pendente
                </span>
              </li>
              <li className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Mário Souza</p>
                  <p className="text-muted-foreground text-xs">
                    Advogado · OAB/MG 200.000
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  Não requerida
                </span>
              </li>
            </ul>
          </SectionCard>

          <div>
            <label
              htmlFor="senha-cert"
              className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase"
            >
              Senha do certificado
            </label>
            <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring/40 mt-1.5 flex items-center gap-2 rounded-lg border px-3 shadow-xs transition-colors focus-within:ring-3">
              <Lock className="text-muted-foreground size-3.5 shrink-0" />
              <input
                id="senha-cert"
                type="password"
                defaultValue="●●●●●●●●●●"
                className="text-foreground h-10 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
              <ShieldCheck className="size-3" />A assinatura é feita localmente;
              a senha não é armazenada.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Etapa 3 · Protocolo ─────────────────────────────────────────────────────

function ProtocoloView({
  anexos,
  protocolado,
}: {
  anexos: Anexo[];
  protocolado: boolean;
}) {
  if (protocolado) return <ProtocoladoSuccess anexos={anexos} />;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-1 pb-5">
        <h1 className="font-display text-2xl leading-none tracking-tight">
          Protocolo
        </h1>
        <p className="text-muted-foreground text-sm">
          Revise o destino e envie a petição para o tribunal.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard title="Destino do protocolo">
          <dl>
            <Row label="Tribunal">
              TJMG · Tribunal de Justiça de Minas Gerais
            </Row>
            <Row label="Comarca">Belo Horizonte</Row>
            <Row label="Vara">10ª Vara Cível</Row>
            <Row label="Processo">5001234-56.2026.8.13.0001</Row>
            <Row label="Classe">Ação de Cobrança</Row>
          </dl>
        </SectionCard>

        <SectionCard title="Informações do protocolo">
          <dl>
            <Row label="Tipo">Peticionamento intercorrente</Row>
            <Row label="Sigilo">Público</Row>
            <Row label="Prioridade">Normal</Row>
            <Row label="Pedido de urgência">Não</Row>
            <Row label="Solicitar vista ao MP">Não</Row>
          </dl>
        </SectionCard>
      </div>

      <div className="bg-card ring-foreground/10 mx-auto mt-4 flex max-w-4xl items-center gap-3 rounded-xl p-4 shadow-sm ring-1">
        <Building2 className="text-primary size-5 shrink-0" />
        <p className="text-sm">
          <span className="font-medium">1 peça + {anexos.length} anexos</span>{" "}
          <span className="text-muted-foreground">
            serão enviados ao tribunal. Use &ldquo;Enviar protocolo&rdquo; no
            topo.
          </span>
        </p>
      </div>
      <p className="text-muted-foreground mx-auto mt-2 flex max-w-4xl items-center gap-1.5 text-xs">
        <Clock className="size-3" />
        Não feche a página após enviar — você será notificado quando o protocolo
        for gerado.
      </p>
    </div>
  );
}

function ProtocoladoSuccess({ anexos }: { anexos: Anexo[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="bg-card ring-foreground/10 mx-auto mt-6 flex max-w-xl flex-col items-center gap-3 rounded-xl p-10 text-center shadow-sm ring-1">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="font-display text-2xl leading-tight">
          Petição protocolada com sucesso!
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Sua petição e os {anexos.length} anexos foram recebidos pelo tribunal
          e já estão disponíveis no processo.
        </p>

        <dl className="bg-muted/40 mt-3 grid w-full grid-cols-2 gap-x-6 gap-y-3 rounded-xl border p-4 text-left">
          <Field label="Número da petição">2026.0000.12345678-9</Field>
          <Field label="Data e hora">16/08/2026 · 15:47</Field>
          <Field label="Tribunal">TJMG</Field>
          <Field label="Órgão julgador">10ª Vara Cível</Field>
        </dl>

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm">
            <Download data-icon="inline-start" className="size-3.5" />
            Baixar comprovante
          </Button>
          <Button size="sm">Ver no processo</Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers das etapas de revisão ───────────────────────────────────────────

function SectionCard({
  title,
  children,
  noPad,
}: {
  title: string;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <section className="bg-card ring-foreground/10 flex flex-col rounded-xl shadow-sm ring-1">
      <div className="border-b px-4 py-3">
        <h2 className="font-display text-sm leading-none">{title}</h2>
      </div>
      <div className={noPad ? "" : "p-4"}>{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/60 flex items-start justify-between gap-4 border-b py-2.5 last:border-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground text-right text-sm">{children}</dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground text-sm tabular-nums">{children}</dd>
    </div>
  );
}

function FileBadge({ sm }: { sm?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500",
        sm ? "size-8" : "size-10",
      )}
    >
      <FileText className={sm ? "size-4" : "size-5"} />
    </span>
  );
}
