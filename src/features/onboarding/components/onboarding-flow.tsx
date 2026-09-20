"use client";

import { Building2, Check, Sparkles, User, X } from "lucide-react";

import { CnpjInput } from "@/components/ui/cnpj-input";
import { IconAction } from "@/components/ui/icon-action";
import { OabInput } from "@/components/ui/oab-input";
import { formatOabDisplay } from "@/features/shared/lib/diario";

import { useOnboardingFlow } from "../hooks/use-onboarding-flow";
import { CourtAccessNotice } from "./court-access-notice";
import { OnboardingImageUpload } from "./image-upload";

// Degradê de atmosfera (véu de primário + latão) reusado do body — dá profundidade às
// telas do onboarding sem fugir da identidade. transform/opacity apenas nas animações.
const ATMOSPHERE =
  "radial-gradient(ellipse 70% 45% at 50% -8%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 60%), radial-gradient(ellipse 52% 42% at 100% 0%, color-mix(in oklch, var(--gold) 6%, transparent), transparent 55%)";

// Degradê da CTA primária — leve brilho no topo pra dar volume ao botão.
const CTA_GRADIENT =
  "linear-gradient(180deg, color-mix(in oklch, var(--primary) 92%, white), var(--primary))";

// Degradê do selo/marca e anéis — primário → latão (assinatura do app).
const BRAND_GRADIENT = "linear-gradient(135deg, var(--primary), var(--gold))";

// Onboarding guiado por persona: user → org → oab → team → done. Componente = JSX +
// binding; a lógica/conclusão vive no hook. Tokens da casca: bg-bg, surface-panel,
// bg-panel, border-line, text-fg3, font-display, bg-primary. Campo obrigatório = "*".
export function OnboardingFlow() {
  const f = useOnboardingFlow();

  return (
    <div
      className="bg-bg text-foreground flex h-screen w-screen flex-col font-sans text-[13px]"
      style={{ backgroundImage: ATMOSPHERE, backgroundAttachment: "fixed" }}
    >
      {/* topbar */}
      <div className="border-line flex flex-none items-center gap-3 border-b bg-[var(--panel)]/70 px-[22px] py-[15px] backdrop-blur-sm">
        <span
          className="text-primary-foreground font-display grid size-6 place-items-center rounded-md text-[14px] leading-none shadow-sm"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          A
        </span>
        <span className="font-display text-[16px]">Atjus</span>
        {f.step !== "done" ? (
          <div className="ml-3.5 flex items-center gap-1.5">
            {f.dots.map((on, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: on ? 28 : 20,
                  backgroundImage: on ? BRAND_GRADIENT : "none",
                  background: on ? undefined : "var(--line)",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* corpo centralizado */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-[30px]">
        <div className="surface-panel relative w-[520px] max-w-full overflow-hidden p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] sm:p-7">
          {/* fio de luz no topo do card (primário→latão) */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent, var(--primary), var(--gold), transparent)",
            }}
          />
          <div key={f.step} className="reveal">
            {f.step === "user" ? <UserStep f={f} /> : null}
            {f.step === "org" ? <OrgStep f={f} /> : null}
            {f.step === "oab" ? <OabStep f={f} /> : null}
            {f.step === "team" ? <TeamStep f={f} /> : null}
            {f.step === "done" ? <Done f={f} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type F = ReturnType<typeof useOnboardingFlow>;

// Rótulo com asterisco obrigatório padronizado.
function Label({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-fg3 mb-1.5 block text-[11.5px]">
      {children}
      <span className="text-destructive"> *</span>
    </label>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        className="border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
      />
    </div>
  );
}

function ErroLinha({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <p role="alert" className="text-destructive mt-3 text-[12px]">
      {erro}
    </p>
  );
}

// Botões de rodapé — Voltar (secundário) + CTA primária única.
function Footer({
  onBack,
  backLabel = "Voltar",
  cta,
  onCta,
  disabled,
  busy,
  busyLabel,
  icon,
}: {
  onBack?: () => void;
  backLabel?: string;
  cta: string;
  onCta: () => void;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mt-[26px] flex gap-2.5">
      {onBack ? (
        <button
          onClick={onBack}
          className="border-line bg-panel text-foreground hover:bg-hover min-h-11 rounded-[9px] border px-4 py-2.5 text-[13px]"
        >
          {backLabel}
        </button>
      ) : null}
      <button
        onClick={onCta}
        disabled={disabled || busy}
        style={{ backgroundImage: disabled || busy ? undefined : CTA_GRADIENT }}
        className="bg-primary text-primary-foreground inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-[13px] font-medium shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
      >
        {busy ? (
          <>
            <span className="spin size-[15px] rounded-full border-2 border-white/40 border-t-white" />
            {busyLabel ?? "Aguarde…"}
          </>
        ) : (
          <>
            {icon}
            {cta}
          </>
        )}
      </button>
    </div>
  );
}

// Toggle segmentado genérico (persona, papel do convite) — 2 opções.
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { k: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="border-line bg-bg flex gap-1 rounded-[10px] border p-1">
      {options.map((op) => {
        const on = op.k === value;
        return (
          <button
            key={op.k}
            onClick={() => onChange(op.k)}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[7px] text-[13px] font-medium shadow-none transition-all duration-200 data-[on=true]:shadow-sm"
            data-on={on}
            style={{
              backgroundImage: on ? BRAND_GRADIENT : "none",
              color: on ? "var(--primary-foreground)" : "var(--fg2)",
            }}
          >
            {op.icon}
            {op.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Passo 1: Usuário ──────────────────────────────────────────────────────────
function UserStep({ f }: { f: F }) {
  const iniciais =
    `${f.firstName[0] ?? ""}${f.lastName[0] ?? ""}`.toUpperCase() || "?";
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Bem-vindo ao Atjus
      </div>
      <p className="text-fg3 mb-5 text-[12.5px]">
        Comece por você — é assim que aparece nas peças e no protocolo.
      </p>

      <OnboardingImageUpload
        url={f.avatarUrl}
        initials={iniciais}
        label="Adicionar foto"
        hint="Opcional — aparece nas suas peças"
        onFile={f.uploadAvatar}
        uploading={f.savingAvatar}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          id="onb-first"
          label="Nome"
          value={f.firstName}
          onChange={f.setFirstName}
          placeholder="Renata"
          onEnter={f.continuarUser}
        />
        <Campo
          id="onb-last"
          label="Sobrenome"
          value={f.lastName}
          onChange={f.setLastName}
          placeholder="Marcondes"
          onEnter={f.continuarUser}
        />
      </div>

      <ErroLinha erro={f.erro} />
      <Footer
        cta="Continuar"
        onCta={f.continuarUser}
        disabled={!f.firstName.trim() || !f.lastName.trim()}
      />
    </>
  );
}

// ── Passo 2: Organização ──────────────────────────────────────────────────────
function OrgStep({ f }: { f: F }) {
  const iniciais = (f.razaoSocial.trim()[0] ?? "E").toUpperCase();
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Como você trabalha?
      </div>
      <p className="text-fg3 mb-4 text-[12.5px]">
        Isso define o que o Atjus prepara pra você.
      </p>

      <div className="mb-5">
        <Segmented
          value={f.persona}
          onChange={f.setPersona}
          options={[
            {
              k: "solo",
              label: "Advogado autônomo",
              icon: <User className="size-4" strokeWidth={1.8} />,
            },
            {
              k: "firm",
              label: "Escritório",
              icon: <Building2 className="size-4" strokeWidth={1.8} />,
            },
          ]}
        />
      </div>

      {f.solo ? (
        <div className="border-line text-fg3 bg-bg rounded-[10px] border border-dashed px-4 py-3.5 text-[12.5px] leading-[1.5]">
          Você trabalha por conta própria. Sem razão social, CNPJ ou time — o
          Atjus usa o seu nome nas peças. Dá pra virar escritório depois em
          Configurações.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Label htmlFor="onb-cnpj">CNPJ</Label>
            <CnpjInput
              value={f.cnpj}
              onChange={f.setCnpj}
              onBlur={f.onCnpjBlur}
              className="border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
            />
            <p className="text-fg3 mt-1 text-[11px]">
              {f.cnpjLoading
                ? "Consultando a Receita…"
                : "Buscamos a razão social automaticamente."}
            </p>
          </div>
          <div className="mb-4">
            <Campo
              id="onb-razao"
              label="Razão social"
              value={f.razaoSocial}
              onChange={f.setRazaoSocial}
              placeholder="Prolheti & Marcondes Advogados"
            />
          </div>
          <div className="mb-1">
            <span className="text-fg3 mb-2 block text-center text-[11.5px]">
              Logo do escritório
            </span>
            <OnboardingImageUpload
              url={f.logoPreview}
              initials={iniciais}
              label="Adicionar logo"
              hint="Opcional — usada no papel timbrado"
              onFile={f.stageLogo}
            />
          </div>
        </>
      )}

      <ErroLinha erro={f.erro} />
      <Footer
        onBack={f.voltarUser}
        cta="Continuar"
        onCta={f.continuarOrg}
        busy={f.busy}
        busyLabel="Preparando sua conta…"
      />
    </>
  );
}

// ── Passo 3: OABs ─────────────────────────────────────────────────────────────
function OabStep({ f }: { f: F }) {
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Ative sua primeira captura
      </div>
      <p className="text-fg3 mb-[18px] text-[12.5px] leading-[1.5]">
        Informe as OABs que o Atjus vai monitorar no DJEN. A busca começa em
        segundo plano assim que você concluir.
      </p>

      <div className="mb-3.5">
        <Label>OAB monitorada</Label>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">OAB monitorada</span>
            <OabInput
              value={f.oab}
              onChange={f.setOab}
              onKeyDown={(e) => {
                if (e.key === "Enter") f.addOab();
              }}
              className="border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
            />
          </label>
          <button
            onClick={f.addOab}
            className="border-primary text-primary hover:bg-selected min-h-11 flex-none rounded-[9px] border bg-transparent px-[15px] py-2.5 text-[13px] font-medium"
          >
            Adicionar
          </button>
        </div>
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
            <IconAction
              label={`Remover OAB ${formatOabDisplay(o)}`}
              icon={X}
              onClick={() => f.removeOab(i)}
              className="pointer-coarse:size-11"
            />
          </div>
        ))}
        {f.oabs.length === 0 ? (
          <div className="border-line text-fg3 rounded-[9px] border border-dashed px-[13px] py-3 text-[12px]">
            Nenhuma OAB ainda. Adicione ao menos uma para ativar a captura.
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <CourtAccessNotice />
      </div>

      <ErroLinha erro={f.erro} />
      <Footer
        onBack={f.voltarOrg}
        cta={f.solo ? "Ativar captura e concluir" : "Continuar"}
        icon={
          f.solo ? <Sparkles className="size-[15px]" strokeWidth={1.8} /> : null
        }
        onCta={f.continuarOab}
        disabled={!f.podeConcluir}
        busy={f.saving}
        busyLabel="Preparando sua conta…"
      />
    </>
  );
}

// ── Passo 4: Time (só escritório, pulável) ────────────────────────────────────
function TeamStep({ f }: { f: F }) {
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Convide seu time
      </div>
      <p className="text-fg3 mb-[18px] text-[12.5px] leading-[1.5]">
        Opcional — dá pra fazer depois. Cada pessoa recebe um e-mail para entrar
        no escritório.
      </p>

      <div className="mb-3">
        <Label htmlFor="onb-team-email">E-mail</Label>
        <div className="flex gap-2">
          <input
            id="onb-team-email"
            value={f.teamEmail}
            onChange={(e) => f.setTeamEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") f.addTeamRow();
            }}
            placeholder="advogado@escritorio.com.br"
            className="border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary min-w-0 flex-1 rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
          />
          <button
            onClick={f.addTeamRow}
            className="border-primary text-primary hover:bg-selected min-h-11 flex-none rounded-[9px] border bg-transparent px-[15px] py-2.5 text-[13px] font-medium"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-fg3 mb-1.5 block text-[11.5px]">
          Papel dos próximos convidados
        </span>
        <Segmented
          value={f.teamRole}
          onChange={f.setTeamRole}
          options={[
            { k: "LAWYER", label: "Advogado" },
            { k: "ADMIN", label: "Administrador" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-[7px]">
        {f.teamRows.map((r, i) => (
          <div
            key={`${r.email}-${i}`}
            className="border-line bg-panel flex items-center gap-2.5 rounded-[9px] border px-[13px] py-2.5"
          >
            <span className="flex-1 truncate text-[13px]">{r.email}</span>
            <span className="text-fg3 flex-none text-[11.5px]">
              {r.role === "ADMIN" ? "Administrador" : "Advogado"}
            </span>
            <IconAction
              label={`Remover ${r.email}`}
              icon={X}
              onClick={() => f.removeTeamRow(i)}
              className="pointer-coarse:size-11"
            />
          </div>
        ))}
      </div>

      <ErroLinha erro={f.erro} />
      <Footer
        onBack={f.voltarOab}
        cta={f.teamRows.length > 0 ? "Enviar convites e concluir" : "Concluir"}
        icon={<Sparkles className="size-[15px]" strokeWidth={1.8} />}
        onCta={f.concluir}
        busy={f.saving}
        busyLabel="Preparando sua conta…"
      />
      <button
        onClick={f.concluir}
        disabled={f.saving}
        className="text-fg3 hover:text-foreground mx-auto mt-3 block text-[12px]"
      >
        Pular por agora
      </button>
    </>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────
function Done({ f }: { f: F }) {
  return (
    <div className="flex flex-col gap-5">
      <span
        className="pop text-primary-foreground grid size-14 place-items-center rounded-full shadow-md"
        style={{ backgroundImage: BRAND_GRADIENT }}
      >
        <Check className="size-7" strokeWidth={2.4} />
      </span>
      <div>
        <h1 className="font-display text-[22px] font-medium">
          Captura solicitada
        </h1>
        <p className="text-fg3 mt-2 text-[13px] leading-relaxed">
          {f.capturasAtivadas > 0
            ? "A busca de publicações roda em segundo plano. As intimações aparecem na triagem em tempo real — sem precisar recarregar."
            : "Nenhuma OAB pôde ser ativada. Revise em Configurações › Fontes de dados para iniciar sua primeira captura."}
        </p>
        {f.convitesEnviados > 0 ? (
          <p className="text-fg3 mt-2 text-[13px]">
            {f.convitesEnviados} convite(s) enviado(s) — seu time recebe o link
            de aceite por e-mail.
          </p>
        ) : null}
      </div>
      <ErroLinha erro={f.erro} />
      <button
        onClick={f.abrirApp}
        style={{ backgroundImage: CTA_GRADIENT }}
        className="bg-primary text-primary-foreground inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
      >
        <Sparkles className="size-[15px]" strokeWidth={1.8} />
        Abrir triagem
      </button>
    </div>
  );
}
