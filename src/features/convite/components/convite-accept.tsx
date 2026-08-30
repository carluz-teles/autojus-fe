"use client";

import { ArrowRight, Check, Lock } from "lucide-react";

import { useConviteAccept } from "../hooks/use-convite-accept";

// Tela full-screen de aceite de convite (port de Atjus - Convite.dc.html,
// persona convidado). Card estilo Clerk (Google/Microsoft + nome/senha) →
// "Bem-vindo ao escritório". Componente = JSX + binding.
export function ConviteAccept({ token }: { token: string }) {
  const acc = useConviteAccept(token);

  return (
    <div className="bg-bg text-foreground grid min-h-screen w-full place-items-center p-[30px] font-sans text-[13px]">
      <div className="w-[420px] max-w-full">
        {acc.joined ? (
          <div className="border-line bg-panel rounded-2xl border p-[40px_32px] text-center">
            <div
              className="mx-auto mb-3.5 grid size-[52px] place-items-center rounded-full"
              style={{
                background:
                  "color-mix(in oklch, var(--green) 14%, transparent)",
              }}
            >
              <Check
                className="size-[26px]"
                style={{ color: "var(--green)" }}
                strokeWidth={2.2}
              />
            </div>
            <div className="font-display text-[23px] font-medium">
              Bem-vindo ao escritório
            </div>
            <p className="text-fg3 mx-auto mt-[7px] max-w-[300px] text-[12.5px] leading-[1.5]">
              Você agora faz parte de{" "}
              <strong className="text-foreground font-medium">
                {acc.escritorio}
              </strong>{" "}
              como {acc.papel}.
            </p>
            <button
              onClick={acc.irParaApp}
              className="bg-primary text-primary-foreground mt-5 rounded-[9px] px-[22px] py-[11px] text-[13px] font-medium"
            >
              Ir para o Atjus
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex justify-center">
              <span className="border-line bg-panel text-fg2 inline-flex items-center gap-[7px] rounded-full border py-[5px] pr-3 pl-2 text-[11.5px]">
                <span className="bg-primary text-primary-foreground font-display grid size-[18px] place-items-center rounded-[5px] text-[11px]">
                  A
                </span>
                Convite para{" "}
                <strong className="text-foreground font-medium">
                  {acc.escritorio}
                </strong>{" "}
                ·{" "}
                <span className="font-medium" style={{ color: acc.papelCor }}>
                  {acc.papel}
                </span>
              </span>
            </div>
            <div className="border-line bg-panel overflow-hidden rounded-[14px] border shadow-[0_5px_28px_oklch(0.27_0.012_200/9%)]">
              <div className="px-[30px] pt-[30px] pb-[26px]">
                <div className="mb-[22px] flex flex-col items-center gap-1">
                  <div className="bg-primary text-primary-foreground font-display mb-2 grid size-[34px] place-items-center rounded-lg text-[17px]">
                    A
                  </div>
                  <div className="text-[17px] font-semibold tracking-[-0.01em]">
                    {acc.titulo}
                  </div>
                  <div className="text-fg3 text-[12.5px]">{acc.sub}</div>
                </div>

                <div className="mb-[18px] flex flex-col gap-2">
                  <button
                    onClick={acc.google}
                    className="border-line bg-panel text-foreground hover:bg-hover flex w-full items-center justify-center gap-2.5 rounded-lg border py-[9px] text-[13px] font-medium"
                  >
                    <span
                      className="grid size-4 place-items-center rounded-full"
                      style={{
                        background:
                          "conic-gradient(from -45deg, #ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0)",
                      }}
                    >
                      <span className="bg-panel size-[6.5px] rounded-full" />
                    </span>
                    Continuar com Google
                  </button>
                  <button
                    onClick={acc.microsoft}
                    className="border-line bg-panel text-foreground hover:bg-hover flex w-full items-center justify-center gap-2.5 rounded-lg border py-[9px] text-[13px] font-medium"
                  >
                    <span className="grid size-[15px] grid-cols-2 gap-[1.5px]">
                      <span style={{ background: "#f25022" }} />
                      <span style={{ background: "#7fba00" }} />
                      <span style={{ background: "#00a4ef" }} />
                      <span style={{ background: "#ffb900" }} />
                    </span>
                    Continuar com Microsoft
                  </button>
                </div>
                <div className="mb-[18px] flex items-center gap-2.5">
                  <span className="bg-line2 h-px flex-1" />
                  <span className="text-fg3 text-[11px]">ou</span>
                  <span className="bg-line2 h-px flex-1" />
                </div>

                {acc.ehCriar ? (
                  <>
                    <label className="mb-1.5 block text-[12px] font-medium">
                      Nome completo
                    </label>
                    <input
                      value={acc.nome}
                      onChange={(e) => acc.setNome(e.target.value)}
                      placeholder="Ex.: Luan Gomes"
                      className="border-line bg-panel text-foreground mb-3.5 w-full rounded-lg border px-3 py-[9px] text-[13.5px] outline-none"
                    />
                  </>
                ) : null}

                <label className="mb-1.5 block text-[12px] font-medium">
                  E-mail
                </label>
                <div className="border-line bg-hover mb-3.5 flex items-center gap-2 rounded-lg border px-3 py-[9px]">
                  <span className="text-fg2 flex-1 text-[13.5px]">
                    {acc.email}
                  </span>
                  <Lock className="text-fg3 size-3.5" strokeWidth={1.8} />
                </div>
                <label className="mb-1.5 block text-[12px] font-medium">
                  Senha
                </label>
                <input
                  value={acc.senha}
                  onChange={(e) => acc.setSenha(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="border-line bg-panel text-foreground mb-[18px] w-full rounded-lg border px-3 py-[9px] text-[13.5px] outline-none"
                />
                <button
                  onClick={acc.entrar}
                  disabled={!acc.podeEntrar}
                  className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-[7px] rounded-lg py-2.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {acc.cta}
                  <ArrowRight className="size-[15px]" strokeWidth={2} />
                </button>
                <div className="text-fg3 mt-[18px] text-center text-[12.5px]">
                  {acc.footerTxt}{" "}
                  <button
                    onClick={acc.footerToggle}
                    className="text-primary text-[12.5px] font-medium"
                  >
                    {acc.footerLink}
                  </button>
                </div>
              </div>
              <div className="border-line2 bg-bg text-fg3 flex items-center justify-center gap-1.5 border-t p-3 text-[11px]">
                <Lock className="size-3" strokeWidth={1.9} />
                Protegido por{" "}
                <strong className="text-fg2 font-semibold">Clerk</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
