"use client";

import {
  Building2,
  ChevronRight,
  FileText,
  Link2,
  Mail,
  User,
  Users,
} from "lucide-react";

import type { usePeca } from "../../hooks/use-peca";

type Peca = ReturnType<typeof usePeca>;

// Rail de contexto (288px) — port 743-849. Contexto do processo colapsável, card
// Intimação, Partes, Fundada em (fontes), Teses a incluir, Revisão.
export function PecaRail({ peca }: { peca: Peca }) {
  const m = peca.model;
  if (!m) return null;
  return (
    <div className="border-line bg-panel w-[288px] shrink-0 overflow-y-auto border-r px-4 py-[18px]">
      {/* contexto do processo (colapsável) */}
      <button
        onClick={peca.toggleCtx}
        className="flex w-full items-center gap-[7px] pb-3 text-left"
      >
        <ChevronRight
          className="text-fg3 size-[11px] shrink-0 transition-transform"
          strokeWidth={2.4}
          style={{ transform: peca.ctxAberto ? "rotate(90deg)" : "none" }}
        />
        <span className="text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase">
          Contexto do processo
        </span>
      </button>

      {peca.ctxAberto ? (
        <>
          <div className="flex items-start gap-[9px]">
            <Building2
              className="text-fg3 mt-0.5 size-[15px] shrink-0"
              strokeWidth={1.7}
            />
            <div className="min-w-0 flex-1">
              <div className="text-fg2 font-mono text-[11.5px]">
                {m.cab.cnjCurto}
              </div>
              <div className="text-fg3 mt-px text-[11px]">{m.cab.classe}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px]">
            {m.cab.proc.map((p) => (
              <div key={p.rot} className="contents">
                <span className="text-fg3 text-[11px]">{p.rot}</span>
                <span className="text-fg2 text-[11.5px]">{p.val}</span>
              </div>
            ))}
          </div>

          {/* card Intimação */}
          <div className="border-line bg-bg mt-4 overflow-hidden rounded-[10px] border">
            <div className="border-line2 flex items-center gap-[7px] border-b px-3 py-[9px]">
              <Mail className="text-primary size-[13px]" strokeWidth={1.8} />
              <span className="text-fg2 text-[10.5px] font-semibold tracking-[0.05em] uppercase">
                Intimação
              </span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px] px-3 py-[11px]">
              {m.cab.intimMeta.map((im) => (
                <div key={im.rot} className="contents">
                  <span className="text-fg3 text-[11px]">{im.rot}</span>
                  <span
                    className="text-[11.5px]"
                    style={{
                      color: im.forte ? "var(--fg)" : "var(--fg2)",
                      fontWeight: im.forte ? 600 : 400,
                    }}
                  >
                    {im.val}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-3 pb-[11px]">
              <p className="text-fg2 m-0 line-clamp-3 text-[11px] leading-[1.5]">
                <span className="text-fg3">Teor · </span>
                {m.cab.teor}
              </p>
              <button
                onClick={peca.verTeor}
                className="text-primary mt-1.5 text-[11px] font-medium"
              >
                ver inteiro teor →
              </button>
            </div>
          </div>

          {/* partes */}
          <div className="mt-5 mb-2 flex items-center gap-[7px]">
            <Users className="text-fg3 size-[13px]" strokeWidth={1.8} />
            <span className="text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase">
              Partes
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {m.partes.map((pt) => (
              <div
                key={pt.nome}
                className="rounded-[9px] border p-[9px_10px]"
                style={{
                  borderColor: pt.cliente
                    ? "color-mix(in oklch, var(--primary) 35%, transparent)"
                    : "var(--line)",
                  background: pt.cliente
                    ? "color-mix(in oklch, var(--primary) 6%, transparent)"
                    : "var(--bg)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <User
                    className="text-fg3 size-3 shrink-0"
                    strokeWidth={1.8}
                  />
                  <span className="min-w-0 truncate text-[12px] font-medium">
                    {pt.nome}
                  </span>
                  {pt.cliente ? (
                    <span className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 py-px text-[8.5px] font-semibold tracking-[0.03em]">
                      CLIENTE
                    </span>
                  ) : null}
                </div>
                <div className="text-fg3 mt-[3px] text-[10.5px]">
                  {pt.papel} · {pt.proc}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="border-line2 mb-[18px] h-5 border-b" />

      {/* fundada em (fontes) */}
      <button
        onClick={peca.toggleFontes}
        className="flex w-full items-center gap-[7px] text-left"
      >
        <ChevronRight
          className="text-fg3 size-[11px] shrink-0 transition-transform"
          strokeWidth={2.4}
          style={{ transform: peca.fontesAberto ? "rotate(90deg)" : "none" }}
        />
        <span className="text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase">
          Fundada em
        </span>
        <span className="text-fg3 ml-auto font-mono text-[10.5px]">
          {m.fontes.length}
        </span>
      </button>
      {peca.fontesAberto ? (
        <div className="mt-[9px] flex flex-col gap-1.5">
          {m.fontes.map((f) => (
            <button
              key={f.id}
              onClick={f.onOpen}
              className="bg-bg grid grid-cols-[15px_1fr_auto] items-center gap-[9px] rounded-[9px] border border-l-[3px] p-[9px_10px] text-left"
              style={{ borderLeftColor: f.cor, borderColor: "var(--line)" }}
            >
              <FileText
                className="size-3.5 shrink-0"
                strokeWidth={1.7}
                style={{ color: f.cor }}
              />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium">
                  {f.titulo}
                </span>
                <span className="text-fg3 mt-px block text-[10.5px]">
                  {f.meta}
                </span>
              </span>
              <span
                className="shrink-0 rounded-full px-[7px] py-0.5 text-[9px] font-medium"
                style={{ background: f.tipoFundo, color: f.cor }}
              >
                {f.tipo}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* teses a incluir */}
      <div className="text-fg3 mt-5 mb-2 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        Teses a incluir <span className="text-primary">{m.nSel}</span>
      </div>
      <div className="flex flex-col gap-[7px]">
        {m.teses.map((t) => (
          <div
            key={t.id}
            className="bg-bg overflow-hidden rounded-[9px] border"
            style={{ borderColor: t.borda }}
          >
            <button
              onClick={t.onToggle}
              className="hover:bg-hover grid w-full grid-cols-[16px_1fr] items-start gap-[9px] p-[9px_10px] text-left"
            >
              <span
                className="text-primary-foreground mt-px grid size-[15px] shrink-0 place-items-center rounded-[4px] border text-[9px]"
                style={{
                  borderColor: t.caixaBorda,
                  background: t.caixaFundo,
                }}
              >
                {t.marca}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] font-medium">{t.label}</span>
                  {t.temBadge ? (
                    <span
                      className="rounded-full px-1.5 py-px text-[8.5px] font-semibold tracking-[0.03em] uppercase"
                      style={{ background: t.badgeFundo, color: t.badgeCor }}
                    >
                      {t.badgeLabel}
                    </span>
                  ) : null}
                </span>
                <span className="text-fg3 mt-0.5 block text-[10.5px] leading-[1.4]">
                  {t.desc}
                </span>
              </span>
            </button>
            <button
              onClick={t.onFonte}
              className="border-line2 hover:bg-hover flex w-full items-center gap-[7px] border-t border-dashed py-2 pr-2.5 pl-[35px] text-left"
            >
              <Link2
                className="text-primary size-3 shrink-0"
                strokeWidth={1.8}
              />
              <span className="min-w-0">
                <span className="text-primary block text-[10.5px] font-medium">
                  {t.art}
                </span>
                <span className="text-fg3 mt-px block truncate text-[10px]">
                  {t.fonteRef}
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* revisão */}
      <div className="text-fg3 mt-5 mb-2 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        Revisão
      </div>
      <div className="flex flex-col gap-[7px]">
        {m.revisao.map((r) => (
          <div
            key={r.txt}
            className="flex items-center gap-2 text-[11.5px]"
            style={{ color: r.done ? "var(--fg2)" : "var(--fg3)" }}
          >
            <span
              className="grid size-[14px] shrink-0 place-items-center rounded-full"
              style={{
                background: r.done ? "var(--green)" : "transparent",
                border: `1px solid ${r.done ? "var(--green)" : "var(--line)"}`,
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            {r.txt}
          </div>
        ))}
      </div>
    </div>
  );
}
