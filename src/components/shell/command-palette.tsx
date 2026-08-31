"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { NAV_SECTIONS } from "./nav-config";

// ⌘K — paleta de comando mínima da casca nova. Nesta fatia só navega entre as
// telas (itens do nav). Abre por ⌘K/Ctrl-K global ou pelo botão da sidebar; a
// busca completa (processos, intimações, ações) chega numa fatia futura.
// TODO: ligar busca ao BE (comandos e resultados reais).
interface Comando {
  href: string;
  label: string;
  grupo: string;
}

export function useCommandPalette() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return {
    aberto,
    abrir: () => setAberto(true),
    fechar: () => setAberto(false),
  };
}

export function CommandPalette({
  aberto,
  fechar,
}: {
  aberto: boolean;
  fechar: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ativo, setAtivo] = useState(0);

  const comandos = useMemo<Comando[]>(() => {
    const base: Comando[] = [];
    for (const sec of NAV_SECTIONS) {
      for (const it of sec.itens) {
        base.push({ href: it.href, label: it.label, grupo: sec.titulo });
      }
    }
    const termo = q.trim().toLowerCase();
    if (!termo) return base;
    return base.filter((c) => c.label.toLowerCase().includes(termo));
  }, [q]);

  useEffect(() => {
    if (aberto) {
      setQ("");
      setAtivo(0);
    }
  }, [aberto]);

  useEffect(() => {
    setAtivo(0);
  }, [q]);

  if (!aberto) return null;

  const ir = (href: string) => {
    fechar();
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return fechar();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(comandos.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = comandos[ativo];
      if (alvo) ir(alvo.href);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[16vh]">
      <button
        aria-label="Fechar paleta"
        onClick={fechar}
        className="fixed inset-0 cursor-default bg-[oklch(0.27_0.012_200_/_28%)]"
      />
      <div
        role="dialog"
        aria-label="Buscar ou comandar"
        className="border-line bg-panel relative z-[61] w-full max-w-[560px] overflow-hidden rounded-xl border shadow-[0_24px_60px_oklch(0.27_0.012_200_/_24%)]"
      >
        <div className="border-line2 flex items-center gap-2.5 border-b px-4 py-3">
          <Search className="text-fg3 size-4 shrink-0" strokeWidth={1.9} />
          {}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar ou comandar…"
            className="placeholder:text-fg3 text-foreground flex-1 bg-transparent text-[13px] outline-none"
          />
          <span className="border-line bg-hover text-fg3 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none">
            esc
          </span>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {comandos.length === 0 ? (
            <p className="text-fg3 px-3 py-6 text-center text-xs">
              Nada encontrado.
            </p>
          ) : (
            comandos.map((c, i) => (
              <button
                key={c.href}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => ir(c.href)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px]",
                  i === ativo ? "bg-hover text-foreground" : "text-fg2",
                )}
              >
                <span>{c.label}</span>
                <span className="text-fg3 text-[11px]">{c.grupo}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
