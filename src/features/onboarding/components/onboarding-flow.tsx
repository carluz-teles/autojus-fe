"use client";

import {
  Building2,
  Check,
  ChevronDown,
  FileStack,
  Info,
  Landmark,
  ScrollText,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";

import { CnpjInput } from "@/components/ui/cnpj-input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { OabInput } from "@/components/ui/oab-input";
import { useSlidingIndicator } from "@/components/ui/use-sliding-indicator";
import { ConfigTribunais } from "@/features/prazos/components/config/config-tribunais";
import { OabTermRow } from "@/features/shared/components/oab-term-row";
import { formatOabTermo } from "@/features/shared/lib/diario";
import { cn } from "@/lib/utils";

import { useOnboardingFlow } from "../hooks/use-onboarding-flow";
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
          <ol
            className="ml-3.5 flex items-center gap-2.5 sm:gap-3"
            aria-label="Progresso do cadastro"
          >
            {f.steps.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-1.5"
                aria-current={s.current ? "step" : undefined}
              >
                <span
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={
                    s.done || s.current
                      ? {
                          width: s.current ? 26 : 18,
                          backgroundImage: BRAND_GRADIENT,
                        }
                      : { width: 14, backgroundColor: "var(--line)" }
                  }
                />
                <span
                  className={cn(
                    "hidden text-[10.5px] leading-none tracking-[0.01em] transition-colors sm:inline",
                    s.current
                      ? "text-foreground font-medium"
                      : s.done
                        ? "text-fg3"
                        : "text-fg3/55",
                  )}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {/* corpo centralizado */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-[30px]">
        <div
          className={`surface-panel relative w-full max-w-full overflow-hidden p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)] sm:p-7 ${
            f.step === "autos" ? "sm:w-[720px]" : "sm:w-[520px]"
          }`}
        >
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
            {f.step === "autos" ? <AutosStep f={f} /> : null}
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
  const { containerRef, rect } = useSlidingIndicator(value);
  return (
    <div
      ref={containerRef}
      className="border-line bg-bg relative flex gap-1 rounded-[10px] border p-1"
    >
      {/* pílula deslizante (indicador ativo) — mesma mecânica das abas */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-[7px] shadow-sm transition-all duration-200 ease-out"
        style={{
          left: rect.left,
          width: rect.width,
          opacity: rect.ready ? 1 : 0,
          backgroundImage: BRAND_GRADIENT,
        }}
      />
      {options.map((op) => {
        const on = op.k === value;
        return (
          <button
            key={op.k}
            type="button"
            onClick={() => onChange(op.k)}
            data-slide-active={on}
            className="relative z-10 flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[7px] text-[13px] font-medium transition-colors duration-200"
            style={{ color: on ? "var(--primary-foreground)" : "var(--fg2)" }}
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
  const {
    register,
    watch,
    formState: { errors },
  } = f.userForm;
  const [first, last] = watch(["firstName", "lastName"]);
  const iniciais = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      f.continuarUser();
    }
  };

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
        <Field data-invalid={!!errors.firstName}>
          <FieldLabel htmlFor="onb-first">
            Nome<span className="text-destructive"> *</span>
          </FieldLabel>
          <Input
            id="onb-first"
            placeholder="Renata"
            aria-invalid={!!errors.firstName}
            onKeyDown={onEnter}
            {...register("firstName")}
          />
          <FieldError errors={[errors.firstName]} />
        </Field>
        <Field data-invalid={!!errors.lastName}>
          <FieldLabel htmlFor="onb-last">
            Sobrenome<span className="text-destructive"> *</span>
          </FieldLabel>
          <Input
            id="onb-last"
            placeholder="Marcondes"
            aria-invalid={!!errors.lastName}
            onKeyDown={onEnter}
            {...register("lastName")}
          />
          <FieldError errors={[errors.lastName]} />
        </Field>
      </div>

      <ErroLinha erro={f.erro} />
      <Footer cta="Continuar" onCta={f.continuarUser} />
    </>
  );
}

// ── Passo 2: Organização ──────────────────────────────────────────────────────
function OrgStep({ f }: { f: F }) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = f.orgForm;
  const iniciais = (
    (watch("razaoSocial") ?? "").trim()[0] ?? "E"
  ).toUpperCase();
  const CNPJ_CLASS =
    "border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary aria-invalid:border-destructive w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none";

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
          <div className="mb-5">
            <span className="text-fg3 mb-2 block text-center text-[11.5px]">
              Logo do escritório
            </span>
            <OnboardingImageUpload
              url={f.logoPreview}
              initials={iniciais}
              label="Adicionar logo"
              hint="Usada no papel timbrado"
              onFile={f.stageLogo}
            />
          </div>
          <Field data-invalid={!!errors.cnpj} className="mb-4">
            <FieldLabel htmlFor="onb-cnpj">
              CNPJ<span className="text-destructive"> *</span>
            </FieldLabel>
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <CnpjInput
                  id="onb-cnpj"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    f.onCnpjBlur();
                  }}
                  aria-invalid={!!errors.cnpj}
                  className={CNPJ_CLASS}
                />
              )}
            />
            <p className="text-fg3 mt-1 text-[11px]">
              {f.cnpjLoading
                ? "Consultando a Receita…"
                : "Buscamos a razão social automaticamente."}
            </p>
            <FieldError errors={[errors.cnpj]} />
          </Field>
          <Field data-invalid={!!errors.razaoSocial} className="mb-1">
            <FieldLabel htmlFor="onb-razao">
              Razão social<span className="text-destructive"> *</span>
            </FieldLabel>
            <Input
              id="onb-razao"
              placeholder="Prolheti & Marcondes Advogados"
              aria-invalid={!!errors.razaoSocial}
              {...register("razaoSocial")}
            />
            <FieldError errors={[errors.razaoSocial]} />
          </Field>
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
  const {
    control,
    formState: { errors },
  } = f.oabForm;
  return (
    <>
      <div className="font-display mb-1 text-[21px] font-medium">
        Ative sua primeira captura
      </div>
      <p className="text-fg3 mb-[18px] text-[12.5px] leading-[1.5]">
        Informe as OABs que o Atjus vai monitorar no DJEN. A busca começa em
        segundo plano assim que você concluir.
      </p>

      <Field data-invalid={!!errors.oab} className="mb-3.5">
        <FieldLabel htmlFor="onb-oab">OAB monitorada</FieldLabel>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Controller
              name="oab"
              control={control}
              render={({ field }) => (
                <OabInput
                  id="onb-oab"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.oab}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      f.addOab();
                    }
                  }}
                  className="border-line bg-panel text-foreground placeholder:text-fg3 focus:border-primary aria-invalid:border-destructive w-full rounded-[9px] border px-[13px] py-2.5 text-[13.5px] outline-none"
                />
              )}
            />
          </div>
          <button
            type="button"
            onClick={f.addOab}
            className="border-primary text-primary hover:bg-selected min-h-11 flex-none rounded-[9px] border bg-transparent px-[15px] py-2.5 text-[13px] font-medium"
          >
            Adicionar
          </button>
        </div>
        <FieldError errors={[errors.oab]} />
      </Field>

      {f.oabs.length === 0 ? (
        <div className="border-line text-fg3 rounded-[10px] border border-dashed px-[13px] py-3 text-[12px]">
          Nenhuma OAB ainda. Adicione ao menos uma para ativar a captura.
        </div>
      ) : (
        <div className="surface-panel overflow-hidden">
          {f.oabs.map((o, i) => (
            <OabTermRow
              key={`${o}-${i}`}
              value={formatOabTermo(o)}
              subtitle="aguardando 1ª captura"
            >
              <IconAction
                label={`Remover OAB ${formatOabTermo(o)}`}
                icon={X}
                onClick={() => f.removeOab(i)}
                className="pointer-coarse:size-11"
              />
            </OabTermRow>
          ))}
        </div>
      )}

      <div className="border-line bg-bg mt-4 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3">
        <Info
          className="text-primary mt-px size-4 flex-none"
          strokeWidth={1.9}
        />
        <p className="text-fg3 text-[12px] leading-[1.5]">
          As publicações já chegam pelo DJEN só com a OAB. O acesso aos autos
          (certificado + 2FA do tribunal) você configura depois, em
          Configurações — sem pressa agora.
        </p>
      </div>

      <ErroLinha erro={f.erro} />
      <Footer
        onBack={f.voltarOrg}
        cta="Continuar"
        onCta={f.continuarOab}
        disabled={!f.podeConcluir}
      />
    </>
  );
}

// ── Passo 4: Acesso ao tribunal (INDUÇÃO — nudge, nunca bloqueio) ──────────────
// Persuade a conectar o tribunal AGORA: com os autos, os prazos e as peças
// trabalham com o processo INTEIRO; sem eles, ficam superficiais. Reusa o fluxo de
// conexão real (ConfigTribunais). "Adiar" fica visível, mas claramente secundário.
function AutosStep({ f }: { f: F }) {
  const [expandido, setExpandido] = useState(false);

  const beneficios = [
    {
      icon: <ScrollText className="size-4" strokeWidth={1.9} />,
      titulo: "Prazos com base no processo inteiro",
      texto:
        "A contagem enxerga o que realmente aconteceu nos autos — não só a publicação.",
    },
    {
      icon: <FileStack className="size-4" strokeWidth={1.9} />,
      titulo: "Peças mais completas",
      texto:
        "Com os autos em mãos, cada peça sai fundamentada no que está no processo.",
    },
    {
      icon: <ShieldCheck className="size-4" strokeWidth={1.9} />,
      titulo: "Um acesso, tudo destravado",
      texto:
        "Um certificado + 2FA conecta o tribunal uma vez — os autos passam a chegar sozinhos.",
    },
  ];

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span
          className="text-primary-foreground grid size-7 place-items-center rounded-lg shadow-sm"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          <Landmark className="size-4" strokeWidth={1.9} aria-hidden />
        </span>
        <div className="font-display text-[21px] font-medium">
          Conecte o acesso aos autos
        </div>
      </div>
      <p className="text-fg3 mb-4 text-[12.5px] leading-[1.5]">
        As publicações já chegam pela OAB. Conectar o tribunal traz os{" "}
        <strong className="text-foreground font-medium">autos completos</strong>{" "}
        — e é aí que o Atjus faz a diferença de verdade.
      </p>

      <div className="mb-4 flex flex-col gap-2">
        {beneficios.map((b) => (
          <div
            key={b.titulo}
            className="border-line bg-bg flex items-start gap-3 rounded-[11px] border px-3.5 py-3"
          >
            <span className="text-primary bg-selected mt-px grid size-8 flex-none place-items-center rounded-lg">
              {b.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{b.titulo}</p>
              <p className="text-fg3 text-[12px] leading-[1.5]">{b.texto}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA primária: revela o fluxo real de conexão (ConfigTribunais). É o caminho
          fácil e atraente. */}
      {expandido ? (
        <div className="reveal border-line bg-bg mb-2 max-h-[46vh] overflow-y-auto rounded-[12px] border p-3.5">
          <ConfigTribunais />
        </div>
      ) : (
        <button
          onClick={() => setExpandido(true)}
          className="border-primary/40 hover:bg-selected group mb-2 flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition-colors"
          style={{
            backgroundImage:
              "radial-gradient(120% 120% at 0% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 60%)",
          }}
        >
          <span
            className="text-primary-foreground grid size-9 flex-none place-items-center rounded-xl shadow-sm"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >
            <ShieldCheck className="size-4" strokeWidth={1.9} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">
              Configurar acesso ao tribunal agora
            </span>
            <span className="text-fg3 block text-[12px]">
              Certificado A1 + 2FA — leva um minuto e vale pra todos os
              tribunais.
            </span>
          </span>
          <ChevronDown
            className="text-fg3 group-hover:text-primary size-4 flex-none"
            aria-hidden
          />
        </button>
      )}

      <div className="border-line bg-bg mt-2 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3">
        <Info
          className="text-primary mt-px size-4 flex-none"
          strokeWidth={1.9}
        />
        <p className="text-fg3 text-[12px] leading-[1.5]">
          Pode configurar depois em Configurações › Fontes de dados — mas quanto
          antes conectar, mais completo o Atjus fica desde o primeiro processo.
        </p>
      </div>

      <ErroLinha erro={f.erro} />
      <Footer
        onBack={f.voltarOabDeAutos}
        cta={f.solo ? "Concluir" : "Continuar"}
        icon={
          f.solo ? <Sparkles className="size-[15px]" strokeWidth={1.8} /> : null
        }
        onCta={f.continuarAutos}
        busy={f.saving}
        busyLabel="Preparando sua conta…"
      />
      <button
        onClick={f.continuarAutos}
        disabled={f.saving}
        className="text-fg3 hover:text-foreground mx-auto mt-3 block text-[12px]"
      >
        Adiar — configurar depois
      </button>
    </>
  );
}

// ── Passo 5: Time (só escritório, pulável) ────────────────────────────────────
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
        Adiar — configurar depois
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
