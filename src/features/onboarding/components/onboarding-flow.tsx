"use client";

import {
  Building2,
  Check,
  ChevronRight,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { OabInput } from "@/components/ui/oab-input";
import { formatOabDisplay } from "@/features/shared/lib/diario";

import { useOnboardingFlow } from "../hooks/use-onboarding-flow";

// Onboarding "Linear" full-screen (port de Atjus - Onboarding.dc.html): 4 passos
// welcome → org → oab → done. Componente = JSX + binding; a lógica/conclusão vive
// no hook. Mapeamentos de token: var(--accent)→var(--primary), var(--serif)→
// font-display, var(--mono)→font-mono; --bg/--panel/--line/--fg2/--fg3/--green/
// --selected/--hover são tokens da casca.
export function OnboardingFlow() {
  const f = useOnboardingFlow();
  const solo = f.role === "solo";

  return (
    <div className="bg-bg text-foreground flex h-screen w-screen flex-col font-sans text-[13px]">
      {/* topbar */}
      <div className="border-line bg-panel flex flex-none items-center gap-3 border-b px-[22px] py-[15px]">
        <span className="bg-primary text-primary-foreground font-display grid size-6 place-items-center rounded-md text-[14px] leading-none">
          A
        </span>
        <span className="font-display text-[16px]">Atjus</span>
        {f.temDots ? (
          <div className="ml-3.5 flex items-center gap-1.5">
            {f.dots.map((on, i) => (
              <span
                key={i}
                className="h-1 w-[26px] rounded-full"
                style={{ background: on ? "var(--primary)" : "var(--line)" }}
              />
            ))}
          </div>
        ) : null}
        <button
          onClick={f.reiniciar}
          className="border-line bg-panel text-fg3 hover:bg-hover ml-auto rounded-[7px] border px-2.5 py-[5px] text-[11.5px]"
        >
          Reiniciar
        </button>
      </div>

      {/* corpo centralizado */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-[30px]">
        <div className="w-[520px] max-w-full">
          {f.step === "welcome" ? <Welcome f={f} /> : null}
          {f.step === "org" ? <Org f={f} solo={solo} /> : null}
          {f.step === "oab" ? <Oab f={f} /> : null}
          {f.step === "done" ? <Done f={f} /> : null}
        </div>
      </div>
    </div>
  );
}

type F = ReturnType<typeof useOnboardingFlow>;

function Welcome({ f }: { f: F }) {
  const roles = [
    {
      k: "novo" as const,
      t: "Novo escritório",
      d: "Sou sócio/admin e vou configurar do zero",
      icon: (
        <Building2 className="text-primary size-[19px]" strokeWidth={1.7} />
      ),
    },
    {
      k: "solo" as const,
      t: "Advogado solo",
      d: "Trabalho por conta própria",
      icon: <User className="text-primary size-[19px]" strokeWidth={1.7} />,
    },
  ];
  return (
    <>
      <div className="mb-1.5 text-center">
        <div className="font-display text-[27px] font-medium tracking-[-0.01em]">
          Bem-vindo ao Atjus
        </div>
        <p className="text-fg3 mx-auto mt-2 max-w-[400px] text-[13px] leading-[1.55]">
          Prazos e intimações sob controle, direto do DJEN. Como você vai usar?
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-2.5">
        {roles.map((r) => (
          <button
            key={r.k}
            onClick={() => f.escolherPapel(r.k)}
            className="row-hover border-line bg-panel flex items-center gap-3 rounded-xl border p-[15px_16px] text-left"
          >
            <span
              className="grid size-[38px] flex-none place-items-center rounded-[9px]"
              style={{
                background:
                  "color-mix(in oklch, var(--primary) 11%, transparent)",
              }}
            >
              {r.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{r.t}</span>
              <span className="text-fg3 mt-px block text-[12px]">{r.d}</span>
            </span>
            <ChevronRight className="text-fg3 size-4" strokeWidth={2} />
          </button>
        ))}
      </div>
    </>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <>
      <label className="text-fg3 mb-1.5 block text-[11.5px]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-line bg-panel text-foreground placeholder:text-fg3 w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
      />
    </>
  );
}

function Org({ f, solo }: { f: F; solo: boolean }) {
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        {solo ? "Seus dados" : "Seu escritório"}
      </div>
      <p className="text-fg3 mb-5 text-[12.5px]">
        {solo
          ? "Como você aparece nas peças e no protocolo."
          : "Como aparece nas peças e no protocolo."}
      </p>
      <div className="mb-4">
        <Campo
          label={solo ? "Nome completo" : "Razão social"}
          value={f.nome}
          onChange={f.setNome}
          placeholder={
            solo
              ? "Ex.: Renata Marcondes"
              : "Ex.: Prolheti & Marcondes Advogados"
          }
        />
      </div>
      {solo ? (
        <>
          <label className="text-fg3 mb-1.5 block text-[11.5px]">Sua OAB</label>
          <OabInput
            value={f.doc}
            onChange={f.setDoc}
            className="border-line bg-panel text-foreground placeholder:text-fg3 w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
          />
        </>
      ) : (
        <Campo
          label="CNPJ"
          value={f.doc}
          onChange={f.setDoc}
          placeholder="00.000.000/0000-00"
        />
      )}
      <div className="mt-[26px] flex gap-2.5">
        <button
          onClick={f.voltarWelcome}
          className="border-line bg-panel text-foreground hover:bg-hover rounded-[9px] border px-4 py-2.5 text-[13px]"
        >
          Voltar
        </button>
        <button
          onClick={f.irOab}
          className="bg-primary text-primary-foreground flex-1 rounded-[9px] px-4 py-2.5 text-[13px] font-medium"
        >
          Continuar
        </button>
      </div>
    </>
  );
}

function Oab({ f }: { f: F }) {
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Capture direto do DJEN
      </div>
      <p className="text-fg3 mb-[18px] text-[12.5px] leading-[1.5]">
        Adicione as OABs que o Atjus vai vigiar. Toda intimação chega porque
        casou com uma delas.
      </p>
      <div className="mb-3.5 flex gap-2">
        <OabInput
          value={f.oab}
          onChange={f.setOab}
          onKeyDown={(e) => {
            if (e.key === "Enter") f.addOab();
          }}
          className="border-line bg-panel text-foreground placeholder:text-fg3 flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
        />
        <button
          onClick={f.addOab}
          className="border-primary text-primary flex-none rounded-[9px] border bg-transparent px-[15px] py-2.5 text-[13px] font-medium"
        >
          Adicionar
        </button>
      </div>
      <div className="flex min-h-[44px] flex-col gap-[7px]">
        {f.oabs.map((o, i) => (
          <div
            key={`${o}-${i}`}
            className="border-line bg-panel flex items-center gap-2.5 rounded-[9px] border px-[13px] py-2.5"
          >
            <User
              className="text-primary size-[15px] flex-none"
              strokeWidth={1.8}
            />
            <span className="flex-1 font-mono text-[13px]">
              {formatOabDisplay(o)}
            </span>
            <button
              onClick={() => f.removeOab(i)}
              className="text-fg3 hover:bg-hover grid size-[22px] place-items-center rounded-md"
            >
              <X className="size-[13px]" strokeWidth={2} />
            </button>
          </div>
        ))}
        {f.oabs.length === 0 ? (
          <div className="border-line text-fg3 rounded-[9px] border border-dashed px-[13px] py-3 text-[12px]">
            Nenhuma OAB ainda. Adicione ao menos uma para ativar a captura.
          </div>
        ) : null}
      </div>
      {f.erro ? (
        <p className="text-destructive mt-3 text-[12px]" role="alert">
          {f.erro}
        </p>
      ) : null}
      <div className="mt-6 flex gap-2.5">
        <button
          onClick={f.voltarOrg}
          className="border-line bg-panel text-foreground hover:bg-hover rounded-[9px] border px-4 py-2.5 text-[13px]"
        >
          Voltar
        </button>
        <button
          onClick={f.concluir}
          disabled={!f.podeConcluir || f.preparando}
          className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
        >
          {f.preparando ? (
            <>
              <span className="spin size-[15px] rounded-full border-2 border-white/40 border-t-white" />
              Preparando sua conta…
            </>
          ) : (
            <>
              <Sparkles className="size-[15px]" strokeWidth={1.8} />
              Ativar captura e concluir
            </>
          )}
        </button>
      </div>
    </>
  );
}

function Done({ f }: { f: F }) {
  const itens = [
    {
      k: "cert",
      t: "Enviar certificado digital",
      d: "Para assinar e protocolar peças",
    },
    {
      k: "equipe",
      t: "Convidar a equipe",
      d: "Dê acesso aos advogados do escritório",
    },
    {
      k: "regras",
      t: "Regras de prazo",
      d: "Buffer interno e base de feriados",
    },
  ];
  return (
    <>
      <div className="mb-[22px] text-center">
        <div
          className="mx-auto mb-3.5 grid size-[52px] place-items-center rounded-full"
          style={{
            background: "color-mix(in oklch, var(--green) 14%, transparent)",
          }}
        >
          <Check
            className="size-[26px]"
            style={{ color: "var(--green)" }}
            strokeWidth={2.2}
          />
        </div>
        <div className="font-display text-[23px] font-medium">Tudo pronto</div>
        <p className="text-fg3 mx-auto mt-[7px] max-w-[380px] text-[12.5px] leading-[1.5]">
          Estamos varrendo o DJEN em segundo plano — as primeiras intimações
          aparecem na sua Inbox em instantes. Configure o resto quando quiser.
        </p>
        {f.erro ? (
          <p
            className="text-fg2 border-line bg-panel mx-auto mt-3 max-w-[380px] rounded-[9px] border px-3 py-2 text-[11.5px] leading-[1.45]"
            role="status"
          >
            {f.erro}
          </p>
        ) : null}
        <button
          onClick={f.abrirApp}
          className="bg-primary text-primary-foreground mt-[18px] rounded-[9px] px-5 py-[11px] text-[13px] font-medium"
        >
          Abrir o Atjus
        </button>
      </div>
      <div className="text-fg3 mx-0.5 mb-2.5 text-[10.5px] font-medium tracking-[0.05em] uppercase">
        Próximos passos
      </div>
      <div className="flex flex-col gap-2">
        {itens.map((c) => {
          const done = !!f.chk[c.k];
          return (
            <button
              key={c.k}
              onClick={() => f.toggleChk(c.k)}
              className="row-hover border-line bg-panel flex items-center gap-3 rounded-[10px] border p-[12px_14px] text-left"
            >
              <span
                className="grid size-5 flex-none place-items-center rounded-md border"
                style={{
                  borderColor: done ? "var(--primary)" : "var(--line)",
                  background: done ? "var(--primary)" : "var(--panel)",
                }}
              >
                {done ? (
                  <Check
                    className="text-primary-foreground size-3"
                    strokeWidth={3}
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[13px] font-medium"
                  style={{ color: done ? "var(--fg3)" : "var(--fg)" }}
                >
                  {c.t}
                </span>
                <span className="text-fg3 block text-[11.5px]">{c.d}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
