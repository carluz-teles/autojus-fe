"use client";

import {
  BadgeCheck,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  KeyRound,
  UploadCloud,
  X,
} from "lucide-react";

import type { useCertWizard } from "../../hooks/use-cert-wizard";

// Modal do wizard "Adicionar certificado" (port de Atjus - Certificado.dc.html):
// tipo → a1/a3 → validando → valido/erro. Componente = JSX + binding.
export function CertWizard({ w }: { w: ReturnType<typeof useCertWizard> }) {
  if (!w.aberto) return null;

  return (
    <div
      onClick={w.fechar}
      className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.27_0.012_200/32%)] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-line bg-panel w-[480px] max-w-full overflow-hidden rounded-2xl border shadow-[0_24px_64px_oklch(0.27_0.012_200/26%)]"
      >
        <div className="border-line2 flex items-start justify-between gap-3 border-b px-[22px] pt-[18px] pb-3.5">
          <div>
            <div className="font-display text-[18px] font-medium">
              {w.titulo}
            </div>
            <p className="text-fg3 mt-[3px] text-[12px]">{w.sub}</p>
          </div>
          <button
            onClick={w.fechar}
            className="text-fg3 hover:bg-hover grid size-7 flex-none place-items-center rounded-[7px]"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-[22px] py-5">
          {w.ehTipo ? (
            <div className="flex flex-col gap-2.5">
              <TipoCard
                icon={
                  <UploadCloud
                    className="text-primary size-[19px]"
                    strokeWidth={1.7}
                  />
                }
                t="Certificado A1 (arquivo)"
                d="Enviar um arquivo .pfx ou .p12"
                onClick={w.pickA1}
              />
              <TipoCard
                icon={
                  <CreditCard
                    className="text-primary size-[19px]"
                    strokeWidth={1.7}
                  />
                }
                t="Certificado A3 (token/cartão)"
                d="Detectar um dispositivo conectado"
                onClick={w.pickA3}
              />
            </div>
          ) : null}

          {w.ehA1 ? (
            !w.file ? (
              <button
                onClick={w.escolher}
                className="border-line bg-bg text-fg2 row-hover mb-2 flex w-full flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed p-[30px_22px]"
              >
                <UploadCloud
                  className="text-primary size-[26px]"
                  strokeWidth={1.6}
                />
                <span className="text-foreground text-[13px] font-medium">
                  Arraste o arquivo ou clique para selecionar
                </span>
                <span className="text-[11.5px]">.pfx ou .p12 · até 5 MB</span>
              </button>
            ) : (
              <>
                <div className="border-line bg-bg mb-4 flex items-center gap-[11px] rounded-[10px] border px-3.5 py-3">
                  <span
                    className="grid size-[34px] flex-none place-items-center rounded-lg"
                    style={{
                      background:
                        "color-mix(in oklch, var(--primary) 11%, transparent)",
                    }}
                  >
                    <FileText
                      className="text-primary size-[17px]"
                      strokeWidth={1.7}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {w.file.nome}
                    </span>
                    <span className="text-fg3 block text-[11.5px]">
                      {w.file.tam}
                    </span>
                  </span>
                  <button
                    onClick={w.trocar}
                    className="border-line bg-panel text-fg2 hover:bg-hover flex-none rounded-[7px] border px-2.5 py-[5px] text-[11.5px]"
                  >
                    Trocar
                  </button>
                </div>
                <label className="text-fg3 mb-1.5 block text-[11.5px]">
                  Senha do certificado
                </label>
                <input
                  value={w.senha}
                  onChange={(e) => w.setSenha(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                />
                <p className="text-fg3 mx-0.5 mt-[9px] text-[11px] leading-[1.5]">
                  A senha é usada só para abrir o certificado no seu
                  dispositivo. Nunca sai daqui em texto puro.
                </p>
              </>
            )
          ) : null}

          {w.ehA3 ? (
            !w.a3found ? (
              <div className="py-6 text-center">
                <div className="border-line border-t-primary spin mx-auto mb-3.5 size-[30px] rounded-full border-[3px]" />
                <div className="text-[13px] font-medium">
                  Procurando dispositivos…
                </div>
                <p className="text-fg3 mt-1.5 text-[11.5px]">
                  Conecte o token ou insira o cartão na leitora.
                </p>
              </div>
            ) : (
              <>
                <div className="border-primary bg-selected mb-4 flex items-center gap-[11px] rounded-[10px] border px-3.5 py-3">
                  <span
                    className="grid size-[34px] flex-none place-items-center rounded-lg"
                    style={{
                      background:
                        "color-mix(in oklch, var(--primary) 14%, transparent)",
                    }}
                  >
                    <KeyRound
                      className="text-primary size-[17px]"
                      strokeWidth={1.7}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      e-CPF Renata Marcondes
                    </span>
                    <span className="text-fg3 block text-[11.5px]">
                      Token SafeNet 5110 · A3
                    </span>
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "var(--green)" }}
                  >
                    detectado
                  </span>
                </div>
                <label className="text-fg3 mb-1.5 block text-[11.5px]">
                  PIN do token
                </label>
                <input
                  value={w.pin}
                  onChange={(e) => w.setPin(e.target.value)}
                  type="password"
                  placeholder="••••"
                  className="border-line bg-bg text-foreground w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                />
              </>
            )
          ) : null}

          {w.ehValidando ? (
            <div className="py-[26px] text-center">
              <div className="border-line border-t-primary spin mx-auto mb-3.5 size-[30px] rounded-full border-[3px]" />
              <div className="text-[13px] font-medium">
                Validando o certificado…
              </div>
              <p className="text-fg3 mt-1.5 text-[11.5px]">
                Conferindo a cadeia de confiança e a validade.
              </p>
            </div>
          ) : null}

          {w.ehValido ? (
            <>
              <div className="mb-3.5 flex items-center gap-2">
                <BadgeCheck
                  className="size-[18px]"
                  style={{ color: "var(--green)" }}
                  strokeWidth={2}
                />
                <span className="text-[13px] font-medium">
                  Certificado válido
                </span>
                <span
                  className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    background:
                      "color-mix(in oklch, var(--green) 12%, transparent)",
                    color: "var(--green)",
                  }}
                >
                  {w.detValidade}
                </span>
              </div>
              <div className="border-line overflow-hidden rounded-[10px] border">
                {w.detLinhas.map((l) => (
                  <div
                    key={l.rot}
                    className="border-line2 flex gap-3 border-b px-3.5 py-[9px] last:border-b-0"
                  >
                    <span className="text-fg3 w-24 flex-none text-[11.5px]">
                      {l.rot}
                    </span>
                    <span
                      className={`flex-1 text-[12.5px] ${l.mono ? "font-mono" : ""}`}
                    >
                      {l.val}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {w.ehErro ? (
            <div className="px-0 pt-3 pb-1 text-center">
              <div
                className="mx-auto mb-3.5 grid size-[46px] place-items-center rounded-full"
                style={{
                  background:
                    "color-mix(in oklch, var(--red) 12%, transparent)",
                }}
              >
                <CircleAlert
                  className="size-6"
                  style={{ color: "var(--red)" }}
                  strokeWidth={2}
                />
              </div>
              <div className="text-[14px] font-medium">{w.erroTitulo}</div>
              <p className="text-fg3 mx-auto mt-1.5 max-w-[300px] text-[12px] leading-[1.5]">
                {w.erroMsg}
              </p>
            </div>
          ) : null}
        </div>

        {w.footer ? (
          <div className="border-line2 flex justify-end gap-2 border-t px-[22px] py-3.5">
            <button
              onClick={w.footer.onVoltar}
              className="border-line bg-panel text-foreground hover:bg-hover rounded-lg border px-3.5 py-2 text-[12.5px] font-medium"
            >
              {w.footer.voltarLabel}
            </button>
            <button
              onClick={w.footer.onPrimary}
              disabled={!w.footer.primaryOn}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
            >
              {w.footer.primaryLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TipoCard({
  icon,
  t,
  d,
  onClick,
}: {
  icon: React.ReactNode;
  t: string;
  d: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="row-hover border-line bg-panel flex items-center gap-3 rounded-xl border p-[15px_16px] text-left"
    >
      <span
        className="grid size-[38px] flex-none place-items-center rounded-[9px]"
        style={{
          background: "color-mix(in oklch, var(--primary) 11%, transparent)",
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{t}</span>
        <span className="text-fg3 mt-px block text-[12px]">{d}</span>
      </span>
      <ChevronRight className="text-fg3 size-4" strokeWidth={2} />
    </button>
  );
}
