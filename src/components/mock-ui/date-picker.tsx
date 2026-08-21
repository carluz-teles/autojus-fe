"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn, formatarData, parseISO } from "@/lib/utils";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Seletor de data com popover absoluto. Fim de semana em tom mudo, hoje em latão. */
export function DatePicker({
  valor,
  onChange,
  hoje = "2026-08-19",
}: {
  valor: string;
  onChange: (iso: string) => void;
  hoje?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const base = parseISO(valor || hoje);
  const [mes, setMes] = useState(new Date(base.getFullYear(), base.getMonth()));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (Date | null)[] = [
    ...Array<null>(primeiro.getDay()).fill(null),
    ...Array.from(
      { length: dias },
      (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1),
    ),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="border-input bg-card flex h-9 w-46 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-[13px] tabular-nums"
      >
        {valor ? formatarData(valor) : "Sem data"}
      </button>

      {aberto && (
        <div className="border-border bg-card absolute top-[calc(100%+4px)] right-0 z-30 w-67 rounded-xl border p-3 shadow-[0_10px_28px_oklch(0.24_0.02_165/14%)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setMes(new Date(mes.getFullYear(), mes.getMonth() - 1))
              }
              className="hover:bg-muted grid size-7 cursor-pointer place-items-center rounded-md"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-[13px] font-medium">
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() =>
                setMes(new Date(mes.getFullYear(), mes.getMonth() + 1))
              }
              className="hover:bg-muted grid size-7 cursor-pointer place-items-center rounded-md"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {SEMANA.map((d, i) => (
              <span
                key={i}
                className="text-muted-foreground grid h-7 place-items-center text-[10.5px]"
              >
                {d}
              </span>
            ))}
            {celulas.map((d, i) => {
              if (!d) return <span key={i} />;
              const iso = toISO(d);
              const fds = d.getDay() === 0 || d.getDay() === 6;
              const selecionado = iso === valor;
              const ehHoje = iso === hoje;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setAberto(false);
                  }}
                  className={cn(
                    "hover:bg-muted grid h-7.5 cursor-pointer place-items-center rounded-md text-[12.5px] tabular-nums",
                    fds && "text-muted-foreground/60",
                    ehHoje && "ring-gold ring-1",
                    selecionado &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
