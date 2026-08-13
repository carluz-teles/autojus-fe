import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Nível de risco do processo — computado por helper determinístico (sem IA).
export type RiskLevel = "critico" | "atencao" | "baixo";

const RISK_META: Record<
  RiskLevel,
  {
    label: string;
    icon: typeof ShieldAlert;
    className: string;
  }
> = {
  critico: {
    label: "Risco crítico",
    icon: ShieldAlert,
    className:
      "border border-destructive/30 bg-destructive/10 text-destructive",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "border-gold/40 bg-gold/[0.08] text-gold border",
  },
  baixo: {
    label: "Sob controle",
    icon: CheckCircle2,
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

/**
 * Badge de risco/situação do DS — recebe um RiskLevel já computado pelo helper e
 * só pinta. Ícone + rótulo por nível; latão = atenção, destructive = crítico.
 */
export function RiskBadge({
  level,
  label,
  className,
}: {
  level: RiskLevel;
  /** Sobrescreve o rótulo padrão do nível (ex. rótulo de lifecycle). */
  label?: string;
  className?: string;
}) {
  const meta = RISK_META[level];
  const Icon = meta.icon;
  return (
    <Badge className={cn(meta.className, className)}>
      <Icon />
      {label ?? meta.label}
    </Badge>
  );
}
