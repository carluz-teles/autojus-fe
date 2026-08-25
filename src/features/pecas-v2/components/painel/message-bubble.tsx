"use client";

// Bolha de mensagem do chat — avatar circular à esquerda, nome + timestamp
// na primeira linha, texto abaixo. Sem balão colorido: texto puro, alinhamento
// consistente. Igual ao print 3.

import { cn } from "@/lib/utils";

import type { ChatRole } from "../../types";

interface Props {
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Renderiza 3 dots piscando no lugar do texto. */
  loading?: boolean;
}

export function MessageBubble({
  role,
  content,
  createdAt,
  loading = false,
}: Props) {
  const isUser = role === "user";
  const timeLabel = shortTime(createdAt);

  return (
    <div className="flex gap-2.5">
      <Avatar isUser={isUser} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <span className="text-[12px] font-medium">
            {isUser ? "Você" : "Assistente"}
          </span>
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {timeLabel}
          </span>
        </div>
        {loading ? (
          <TypingDots />
        ) : (
          <p className="text-[13px] leading-[1.55] whitespace-pre-line">
            {content}
          </p>
        )}
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-medium",
        isUser
          ? "bg-primary/15 text-primary"
          : "bg-[color-mix(in_oklch,var(--gold)_20%,transparent)] text-[color-mix(in_oklch,var(--gold)_70%,var(--foreground))]",
      )}
    >
      {isUser ? "LG" : "AT"}
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="bg-muted-foreground/60 inline-block size-1.5 rounded-full"
      style={{ animation: `rise 1.2s ${delay} ease-in-out infinite alternate` }}
    />
  );
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
