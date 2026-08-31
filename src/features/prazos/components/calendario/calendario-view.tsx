"use client";

import { CalendarDays, Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { usePrazosCalendario } from "../../hooks/use-prazos-calendario";
import { Dia } from "./dia";
import { Mes } from "./mes";
import { Semana } from "./semana";

export type CalModel = ReturnType<typeof usePrazosCalendario>;

// Calendário estilo Google (Mês / Semana / Dia), port do template 1532-1708.
// Full-bleed: top-bar de 44px com título + toggle de modo + Conectar Google,
// depois o corpo do modo ativo. Diálogo Google como overlay.
export function CalendarioView() {
  const cal = usePrazosCalendario();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <CalendarDays className="text-fg2 size-4" strokeWidth={1.9} />
        <span className="text-[13px] font-medium">Calendário</span>
        <span className="text-fg3 font-mono text-[11px]">{cal.titulo}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="bg-hover flex items-center gap-0.5 rounded-md p-0.5">
            <Seg label="Mês" active={cal.ehMes} onClick={cal.setMes} />
            <Seg label="Semana" active={cal.ehSemana} onClick={cal.setSemana} />
            <Seg label="Dia" active={cal.ehDia} onClick={cal.setDia} />
          </div>
          <span className="bg-line mx-1 h-[18px] w-px" />
          <button
            onClick={cal.google.abrir}
            className="border-line bg-panel text-fg2 hover:bg-hover flex items-center gap-2 rounded-[7px] border px-2.5 py-1.5 text-[12px]"
          >
            <span
              aria-hidden
              className="inline-block size-3.5 rounded-full"
              style={{
                background:
                  "conic-gradient(from -45deg, #ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0)",
              }}
            />
            Conectar Google
          </button>
        </div>
      </header>

      {cal.ehMes ? (
        <Mes cal={cal} />
      ) : cal.ehSemana ? (
        <Semana cal={cal} />
      ) : (
        <Dia cal={cal} />
      )}

      {cal.google.aberto ? <GoogleDialog cal={cal} /> : null}
    </div>
  );
}

function Seg({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-panel text-foreground shadow-[0_1px_2px_oklch(0.27_0.012_200_/_14%)]"
          : "text-fg2 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function GoogleDialog({ cal }: { cal: CalModel }) {
  const g = cal.google;
  return (
    <div
      onClick={g.fechar}
      className="fixed inset-0 z-[46] grid place-items-center bg-[oklch(0.27_0.012_200_/_32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[440px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200_/_24%)]"
      >
        <div className="border-line2 flex items-center gap-2.5 border-b px-[22px] pt-5 pb-4">
          <CalendarDays
            className="text-primary size-[18px]"
            strokeWidth={1.8}
          />
          <span className="font-display text-[18px]">Google Agenda</span>
        </div>
        <div className="px-[22px] py-[18px]">
          {g.idle ? (
            <>
              <p className="text-fg2 mb-4 text-[13px] leading-[1.6]">
                Conecte sua conta Google para espelhar automaticamente os prazos
                fatais e audiências na sua agenda pessoal.
              </p>
              <button
                onClick={g.conectar}
                className="border-line bg-bg text-foreground hover:bg-hover inline-flex items-center gap-2.5 rounded-[9px] border px-4 py-2.5 text-[13px] font-medium"
              >
                <span
                  aria-hidden
                  className="inline-block size-[18px] rounded-full"
                  style={{
                    background:
                      "conic-gradient(from -45deg, #ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0)",
                  }}
                />
                Conectar com o Google
              </button>
            </>
          ) : null}

          {g.conectando ? (
            <div className="text-fg2 flex items-center gap-2.5 py-2 text-[13px]">
              <span className="border-line border-t-primary spin size-4 rounded-full border-2" />
              Autorizando na conta Google…
            </div>
          ) : null}

          {g.conectado ? (
            <>
              <div className="border-line bg-bg flex items-center gap-2.5 rounded-[10px] border p-[10px_12px]">
                <span
                  className="grid size-[30px] place-items-center rounded-full"
                  style={{
                    background:
                      "color-mix(in oklch, var(--green) 14%, transparent)",
                    color: "var(--green)",
                  }}
                >
                  <Check className="size-4" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium">
                    renata.marcondes@gmail.com
                  </span>
                  <span className="text-fg3 block text-[11px]">
                    Conectada · agenda “Prazos Atjus”
                  </span>
                </span>
              </div>
              <button
                onClick={g.toggleSync}
                className="mt-3.5 flex w-full items-center gap-2.5"
              >
                <span
                  className="relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors"
                  style={{
                    background: g.sync ? "var(--primary)" : "var(--line)",
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white transition-transform"
                    style={{
                      transform: g.sync ? "translateX(16px)" : "translateX(0)",
                    }}
                  />
                </span>
                <span className="text-[12.5px]">
                  Manter sincronizado automaticamente
                </span>
              </button>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={g.adicionarTodos}
                  className="bg-primary text-primary-foreground flex-1 rounded-lg px-3 py-2.5 text-[12.5px] font-medium"
                >
                  Enviar todos os prazos
                </button>
                <button
                  onClick={g.exportarIcs}
                  className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3 py-2.5 text-[12.5px]"
                >
                  Exportar .ics
                </button>
              </div>
              <button
                onClick={g.desconectar}
                className="text-fg3 mt-2.5 text-[11.5px] underline underline-offset-[3px]"
              >
                Desconectar conta
              </button>
            </>
          ) : null}
        </div>
        <div className="border-line2 flex justify-end border-t px-[22px] py-3">
          <button
            onClick={g.fechar}
            className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
