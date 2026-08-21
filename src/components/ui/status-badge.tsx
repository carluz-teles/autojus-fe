import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Semântica de status compartilhada pelas telas de lista/detalhe. O tom é a
// única fonte de cor; cada domínio (intimação, prazo, peça, tarefa, processo)
// mapeia seu rótulo → tom via um helper exportado. O <Badge> existente pinta por
// baixo (variant="outline" + classes de tom), pra não duplicar o primitivo.
export type StatusTone = "neutral" | "info" | "warning" | "danger" | "success";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-muted/60 text-muted-foreground",
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-gold/40 bg-gold/[0.08] text-gold",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-success/30 bg-success/10 text-success",
};

// Ponto colorido (mesma paleta dos tons) — reusável na coluna de status da
// DataTable, onde o rótulo pode ser omitido e só o ponto marca a situação.
export const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-info",
  warning: "bg-gold",
  danger: "bg-destructive",
  success: "bg-success",
};

/**
 * Badge de status do DS — recebe rótulo + tom já resolvidos (pelos helpers de
 * domínio abaixo ou por chamada direta) e só pinta. Usa o <Badge> por baixo.
 */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASS[tone], className)}>
      <span className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} />
      {label}
    </Badge>
  );
}

// ── Mapas por domínio ────────────────────────────────────────────────────────
// Cada helper devolve o tom a partir do rótulo do BE. Normalizam acento/caixa e
// caem em "neutral" no desconhecido, pra nunca quebrar a UI num status novo.

function norm(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Intimação: Pendente=warning, Em análise=info, Resolvida=success, Ignorada=neutral, Crítica=danger. */
export function intimacaoTone(status: string): StatusTone {
  switch (norm(status)) {
    case "pendente":
      return "warning";
    case "em analise":
      return "info";
    case "resolvida":
      return "success";
    case "ignorada":
      return "neutral";
    case "critica":
      return "danger";
    default:
      return "neutral";
  }
}

/** Prazo: Crítico/Vencido=danger, Vencendo=warning, Aberto=info, Futuro=neutral, Cumprido=success. */
export function prazoTone(status: string): StatusTone {
  switch (norm(status)) {
    case "critico":
    case "vencido":
      return "danger";
    case "vencendo":
      return "warning";
    case "aberto":
      return "info";
    case "futuro":
      return "neutral";
    case "cumprido":
      return "success";
    default:
      return "neutral";
  }
}

/** Peça: Assinada=success, Revisada=info, Rascunho=neutral. Mapeia os rótulos pt-BR de PecaStatus. */
export function pecaTone(status: string): StatusTone {
  switch (norm(status)) {
    case "assinada":
      return "success";
    case "revisada":
      return "info";
    case "rascunho":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Tarefa: Aberta/Pendente=neutral, Em execução=info, Concluída=success, Atrasada=danger. */
export function tarefaTone(status: string): StatusTone {
  switch (norm(status)) {
    case "aberta":
    case "pendente":
      return "neutral";
    case "em execucao":
      return "info";
    case "concluida":
      return "success";
    case "atrasada":
      return "danger";
    default:
      return "neutral";
  }
}

/** Processo: Em andamento=info, Suspenso=warning, Arquivado/Baixado=neutral. */
export function processoTone(status: string): StatusTone {
  switch (norm(status)) {
    case "em andamento":
      return "info";
    case "suspenso":
      return "warning";
    case "arquivado":
    case "baixado":
      return "neutral";
    default:
      return "neutral";
  }
}
