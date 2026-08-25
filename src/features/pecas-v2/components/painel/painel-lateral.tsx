"use client";

// Container do painel lateral direito. Duas tabs por vez: [Iterar OU Revisão] +
// [Chat] — nunca as três juntas. O modo é definido pela autoria da peça:
//   - autoria=assistant (peça gerada pela IA): [Iterar] [Chat]
//   - autoria=human_taken (advogado assumiu): [Revisão] [Chat]
// O corpo é controlado pelo pai; o painel só cuida do chrome e da troca de aba.

import { cn } from "@/lib/utils";

export type PainelTab = "iterar" | "revisao" | "chat";
export type PainelMode = "iterar" | "revisao";

interface Props {
  tab: PainelTab;
  onTabChange: (t: PainelTab) => void;
  children: React.ReactNode;
  /** Qual "aba de trabalho" existe: iterar (peça IA) ou revisao (peça humana). */
  mode: PainelMode;
  /** Quando falso, esconde a tab-bar (usado no modo "Ajuste proposto"). */
  showTabs?: boolean;
  /** Badge de contagem na tab Revisão. Ignorado se mode=iterar. */
  reviewCount?: number;
}

export function PainelLateral({
  tab,
  onTabChange,
  children,
  mode,
  showTabs = true,
  reviewCount,
}: Props) {
  return (
    <aside className="border-border flex w-[400px] shrink-0 flex-col border-l">
      {showTabs && (
        <div className="border-border bg-muted/40 flex items-center gap-1 border-b p-1">
          {mode === "iterar" ? (
            <TabButton
              active={tab === "iterar"}
              onClick={() => onTabChange("iterar")}
            >
              Iterar
            </TabButton>
          ) : (
            <TabButton
              active={tab === "revisao"}
              onClick={() => onTabChange("revisao")}
              badge={reviewCount}
            >
              Revisão
            </TabButton>
          )}
          <TabButton
            active={tab === "chat"}
            onClick={() => onTabChange("chat")}
          >
            Chat
          </TabButton>
        </div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span
          className={cn(
            "grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] tabular-nums",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted-foreground/20 text-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
