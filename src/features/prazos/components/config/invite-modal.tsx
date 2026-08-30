"use client";

import { Check, X } from "lucide-react";

import type { useInvite } from "../../hooks/use-invite";

// Modal "Convidar membro" (port de Atjus - Convite.dc.html): compondo (e-mail +
// chips + papel + protocolar + mensagem) → enviado (sucesso + link). JSX + bind.
export function InviteModal({ inv }: { inv: ReturnType<typeof useInvite> }) {
  if (!inv.aberto) return null;

  return (
    <div
      onClick={inv.fechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[460px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              Convidar membro
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">{inv.sub}</p>
          </div>
          <button
            onClick={inv.fechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        {inv.enviado ? (
          <div className="px-[22px] py-[26px] text-center">
            <div
              className="mx-auto mb-3.5 grid size-[46px] place-items-center rounded-full"
              style={{
                background:
                  "color-mix(in oklch, var(--green) 14%, transparent)",
              }}
            >
              <Check
                className="size-6"
                style={{ color: "var(--green)" }}
                strokeWidth={2.2}
              />
            </div>
            <div className="font-display text-[18px] font-medium">
              {inv.enviadoTitulo}
            </div>
            <p className="text-fg3 mx-auto mt-1.5 mb-4 max-w-[320px] text-[12px] leading-[1.5]">
              Eles recebem um e-mail com o link de aceite. Você também pode
              compartilhar o link direto:
            </p>
            <div className="border-line bg-bg mb-[18px] flex items-center gap-2 rounded-[9px] border px-3 py-2.5">
              <span className="text-fg2 min-w-0 flex-1 truncate font-mono text-[12px]">
                {inv.link}
              </span>
              <button
                onClick={inv.copiar}
                className="border-primary text-primary flex-none rounded-[7px] border bg-transparent px-2.5 py-1.5 text-[11.5px] font-medium"
              >
                {inv.copiarLabel}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={inv.verConvidado}
                className="border-line bg-panel text-foreground hover:bg-hover flex-1 rounded-lg border px-3 py-2.5 text-[12.5px] font-medium"
              >
                Ver a tela do convidado
              </button>
              <button
                onClick={inv.fechar}
                className="bg-primary text-primary-foreground flex-1 rounded-lg px-3 py-2.5 text-[12.5px] font-medium"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-[22px] py-[18px]">
              <label className="text-fg3 mb-1.5 block text-[11.5px]">
                Convidar por e-mail
              </label>
              <div className="mb-2.5 flex gap-2">
                <input
                  value={inv.email}
                  onChange={(e) => inv.setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") inv.addEmail();
                  }}
                  placeholder="nome@escritorio.adv.br"
                  className="border-line bg-bg text-foreground flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                />
                <button
                  onClick={inv.addEmail}
                  className="border-primary text-primary flex-none rounded-[9px] border bg-transparent px-[15px] py-2.5 text-[13px] font-medium"
                >
                  Adicionar
                </button>
              </div>
              {inv.temChips ? (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {inv.chips.map((c) => (
                    <span
                      key={c.email}
                      className="border-line bg-bg inline-flex items-center gap-[7px] rounded-full border py-[5px] pr-[6px] pl-[11px] text-[12px]"
                    >
                      {c.email}
                      <button
                        onClick={c.rm}
                        className="text-fg3 hover:bg-hover grid size-4 place-items-center rounded"
                      >
                        <X className="size-[11px]" strokeWidth={2.2} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <label className="text-fg3 mb-2 block text-[11.5px]">Papel</label>
              <div className="mb-4 flex flex-col gap-2">
                {inv.papeis.map((p) => (
                  <button
                    key={p.k}
                    onClick={p.pick}
                    className="flex items-start gap-[11px] rounded-[10px] border px-[13px] py-[11px] text-left"
                    style={{ borderColor: p.borda, background: p.bg }}
                  >
                    <span
                      className="mt-px grid size-4 flex-none place-items-center rounded-full border"
                      style={{ borderColor: p.ring }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: p.dot }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium">
                        {p.label}
                      </span>
                      <span className="text-fg3 mt-px block text-[11.5px]">
                        {p.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-line bg-bg mb-4 flex items-center gap-3 rounded-[10px] border px-[13px] py-[11px]">
                <span className="flex-1">
                  <span className="block text-[12.5px] font-medium">
                    Pode protocolar
                  </span>
                  <span className="text-fg3 block text-[11px]">
                    Autoriza assinar e enviar peças ao tribunal.
                  </span>
                </span>
                <button
                  onClick={inv.toggleProto}
                  className="relative h-[18px] w-[34px] flex-none rounded-full border-none"
                  style={{ background: inv.protoTrilho }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white transition-transform duration-150"
                    style={{ transform: inv.protoKnob }}
                  />
                </button>
              </div>

              <label className="text-fg3 mb-1.5 block text-[11.5px]">
                Mensagem <span className="text-fg3">(opcional)</span>
              </label>
              <textarea
                value={inv.msg}
                onChange={(e) => inv.setMsg(e.target.value)}
                placeholder="Uma nota pessoal no convite…"
                rows={2}
                className="border-line bg-bg text-foreground w-full resize-y rounded-[9px] border px-[13px] py-2.5 text-[13px] outline-none"
              />
            </div>
            <div className="border-line2 flex justify-end gap-2 border-t px-[22px] py-3.5">
              <button
                onClick={inv.fechar}
                className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={inv.enviar}
                disabled={!inv.podeEnviar}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
              >
                Enviar convite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
