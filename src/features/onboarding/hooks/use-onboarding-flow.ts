"use client";

import {
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { addWatchedOab } from "@/features/integrations/services/integrations.service";
import { inviteMember } from "@/features/organization/actions/invite-member";
import { useApi } from "@/lib/api/use-api";

import { lookupCnpj } from "../lib/cnpj-lookup";
import { getMe } from "../services/onboarding.service";
import type { AccountType } from "../types";
import { ME_KEY } from "./use-me";
import { useOnboarding } from "./use-onboarding";

// Onboarding revamp por PERSONA: Usuário → Organização (toggle Autônomo/Escritório)
// → OABs → Time (só escritório, pulável) → Done. A UI é JSX + binding; a lógica/
// conclusão vive aqui. Mecânica de tenant = a mesma do wizard antigo: cria a Clerk
// Organization → o BE provisiona o tenant SÍNCRONO (GetMe) → grava o perfil
// (updateOrgProfile, agora com account_type) → OABs viram watched-oabs (dispara DJEN
// async) → cai na Triagem que enche ao vivo. Autos (cert+2FA) é opt-in DEPOIS, nunca
// pré-requisito.
export type OnbStep = "user" | "org" | "oab" | "autos" | "team" | "done";
type Phase = "idle" | "creating" | "saving";

const STORED_STEPS = new Set<OnbStep>([
  "user",
  "org",
  "oab",
  "autos",
  "team",
  "done",
]);

// Rótulos curtos do stepper — o passo "autos" (acesso ao tribunal) NÃO pode ficar
// mudo na barra: sem rótulo, parecia que a OAB era o último passo (a confusão que
// motivou isto). "Tribunal" deixa explícito que a config de autos vem a seguir.
const STEP_LABEL: Record<OnbStep, string> = {
  user: "Você",
  org: "Perfil",
  oab: "OABs",
  autos: "Tribunal",
  team: "Equipe",
  done: "Pronto",
};
const digits = (s: string) => s.replace(/\D/g, "");

// Normaliza a OAB digitada ("OAB/SP 214.885", "SP 214885", "214885/SP") pra chave
// canônica "UFNUMERO" que o BE espera (ex.: "SP214885"). Sem UF explícita assume SP.
function normalizeOab(raw: string): string {
  const semPrefixo = raw.replace(/oab/gi, "");
  const uf = (semPrefixo.match(/[A-Za-z]{2}/)?.[0] ?? "SP").toUpperCase();
  return uf + digits(semPrefixo);
}

// ── Schemas por passo (validação declarada UMA vez, via zod) ──────────────────
// Passo 1 (usuário): nome e sobrenome obrigatórios.
const userSchema = z.object({
  firstName: z.string().trim().min(1, "Informe seu nome."),
  lastName: z.string().trim().min(1, "Informe seu sobrenome."),
});
type UserForm = z.infer<typeof userSchema>;

// Passo 2 (organização): persona SEM erro (segmented). Razão social/CNPJ só são
// obrigatórios quando escritório (firm) — validação condicional por superRefine,
// pra que solo passe sem exigir campos que nem aparecem.
const orgSchema = z
  .object({
    persona: z.enum(["solo", "firm"]),
    razaoSocial: z.string().trim(),
    cnpj: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.persona !== "firm") return;
    if (!val.razaoSocial.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["razaoSocial"],
        message: "Informe a razão social.",
      });
    }
    if (digits(val.cnpj).length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cnpj"],
        message: "Informe um CNPJ com 14 dígitos.",
      });
    }
  });
type OrgForm = z.infer<typeof orgSchema>;

// Passo 3 (add-OAB): o input de adicionar uma OAB. Vazio é válido (o "obrigatório"
// de fato é ter ≥1 na LISTA, checado no continuarOab) — aqui só barra lixo curto.
const oabSchema = z.object({
  oab: z.string(),
});
type OabForm = z.infer<typeof oabSchema>;

// ── Passo 1: Usuário (Nome/Sobrenome via RHF + avatar Clerk) ──────────────────
function useUserStep() {
  const { user } = useUser();
  const [savingAvatar, setSavingAvatar] = useState(false);
  const prefilled = useRef(false);

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: "", lastName: "" },
    mode: "onSubmit",
  });
  const { reset, getValues } = form;

  // Prefill do que veio do signup (Clerk) — sync one-time de sistema externo (Clerk)
  // pro estado do form, guardado por ref pra rodar uma vez só (sem cascata). O
  // usuário do Clerk chega async, então o effect é o ponto certo pra semear.
  useEffect(() => {
    if (prefilled.current || !user) return;
    prefilled.current = true;
    reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    });
  }, [user, reset]);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return;
      setSavingAvatar(true);
      try {
        await user.setProfileImage({ file });
      } finally {
        setSavingAvatar(false);
      }
    },
    [user],
  );

  // Persiste nome/sobrenome no Clerk (fonte da identidade) antes de avançar.
  const persistName = useCallback(
    async (values: UserForm) => {
      if (!user) return;
      await user.update({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      });
    },
    [user],
  );

  const fullName = useCallback(() => {
    const { firstName, lastName } = getValues();
    return `${firstName} ${lastName}`.trim();
  }, [getValues]);

  return {
    form,
    fullName,
    avatarUrl: user?.hasImage ? user.imageUrl : null,
    uploadAvatar,
    savingAvatar,
    persistName,
  };
}

// ── Passo 2: Organização (persona + razão social/CNPJ via RHF + logo staged) ──
function useOrgStep() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const cnpjAbort = useRef<AbortController | null>(null);

  const form = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { persona: "solo", razaoSocial: "", cnpj: "" },
    mode: "onSubmit",
  });
  const { control, getValues, setValue } = form;
  const persona = useWatch({ control, name: "persona" });

  // O logo só sobe pro Clerk DEPOIS que a org existe (setLogo precisa da org ativa),
  // então aqui a gente só encena: guarda o File + um preview local (objectURL).
  const stageLogo = useCallback((file: File) => {
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  // No blur do CNPJ (14 dígitos) consulta a Receita e preenche a razão social se
  // ainda estiver vazia — nunca sobrescreve o que o usuário digitou. Best-effort.
  const onCnpjBlur = useCallback(async () => {
    const bare = digits(getValues("cnpj"));
    if (bare.length !== 14) return;
    cnpjAbort.current?.abort();
    const ctrl = new AbortController();
    cnpjAbort.current = ctrl;
    setCnpjLoading(true);
    try {
      const info = await lookupCnpj(bare, ctrl.signal);
      if (info && !getValues("razaoSocial").trim()) {
        setValue("razaoSocial", info.razaoSocial, { shouldValidate: false });
      }
    } finally {
      if (cnpjAbort.current === ctrl) setCnpjLoading(false);
    }
  }, [getValues, setValue]);

  return {
    form,
    persona,
    logoFile,
    logoPreview,
    stageLogo,
    cnpjLoading,
    onCnpjBlur,
  };
}

// ── Passo 3: OABs a vigiar (input add via RHF + lista em estado) ──────────────
function useOabs() {
  const [oabs, setOabs] = useState<string[]>([]);

  const form = useForm<OabForm>({
    resolver: zodResolver(oabSchema),
    defaultValues: { oab: "" },
    mode: "onSubmit",
  });
  const { getValues, setValue } = form;

  const add = useCallback(() => {
    const v = normalizeOab(getValues("oab"));
    if (v && v.length > 2) {
      setOabs((lista) => (lista.includes(v) ? lista : lista.concat(v)));
    }
    setValue("oab", "");
  }, [getValues, setValue]);

  const remove = useCallback(
    (i: number) => setOabs((lista) => lista.filter((_, j) => j !== i)),
    [],
  );

  return { form, oabs, setOabs, add, remove };
}

// ── Passo 4: Time (só escritório, pulável) ────────────────────────────────────
export type TeamRow = { email: string; role: "ADMIN" | "LAWYER" };

function useTeam() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "LAWYER">("LAWYER");
  const add = useCallback(() => {
    setEmail((atual) => {
      const t = atual.trim().toLowerCase();
      if (t.includes("@")) {
        setRows((lista) =>
          lista.some((r) => r.email === t)
            ? lista
            : lista.concat({ email: t, role }),
        );
        return "";
      }
      return atual;
    });
  }, [role]);
  const remove = useCallback(
    (i: number) => setRows((lista) => lista.filter((_, j) => j !== i)),
    [],
  );
  return { rows, email, setEmail, role, setRole, add, remove };
}

export function useOnboardingFlow() {
  const router = useRouter();
  const { userId, orgId } = useAuth();
  const { isLoaded, createOrganization, setActive, userMemberships } =
    useOrganizationList({ userMemberships: { infinite: true } });
  const { organization: activeOrg } = useOrganization();

  const [step, setStep] = useState<OnbStep>("user");
  const [phase, setPhase] = useState<Phase>("idle");
  const [capturasAtivadas, setCapturasAtivadas] = useState(0);
  const [convitesEnviados, setConvitesEnviados] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const restoredStepFor = useRef<string | null>(null);

  const u = useUserStep();
  const o = useOrgStep();
  const oabs = useOabs();
  const team = useTeam();
  const api = useApi();
  const qc = useQueryClient();
  const solo = o.persona === "solo";

  const { tenantReady, updateOrgProfile } = useOnboarding();

  const stepStorageKey = userId ? `atjus:onboarding-step:${userId}` : null;

  // Progresso visual local, isolado por Clerk user. Passos que dependem do tenant só
  // voltam depois que a org foi reativada e seu org_id voltou ao token.
  useEffect(() => {
    if (!stepStorageKey || restoredStepFor.current === stepStorageKey) return;
    const stored = window.localStorage.getItem(
      stepStorageKey,
    ) as OnbStep | null;
    if (stored && STORED_STEPS.has(stored)) {
      if (orgId || stored === "user" || stored === "org") {
        queueMicrotask(() => setStep(stored));
      }
    }
    restoredStepFor.current = stepStorageKey;
  }, [orgId, stepStorageKey]);

  useEffect(() => {
    if (!stepStorageKey || restoredStepFor.current !== stepStorageKey) return;
    window.localStorage.setItem(stepStorageKey, step);
  }, [step, stepStorageKey]);

  // Clerk permite sessão pessoal mesmo já pertencendo a uma org (acontece após hard
  // refresh). Reativa a membership existente antes que o wizard crie uma 2ª org.
  // Com a org ativa, o `orgId` volta ao token e a query /me busca o tenant sozinha.
  useEffect(() => {
    if (!isLoaded || orgId || phase !== "idle") return;
    const membership = userMemberships.data?.[0];
    if (!membership || !setActive) return;
    void setActive({ organization: membership.organization.id })
      .then(() => setErro(null))
      .catch(() =>
        setErro("Não foi possível restaurar o escritório. Tente novamente."),
      );
  }, [isLoaded, orgId, phase, setActive, userMemberships.data]);

  // Passo 1 → 2: valida (RHF) → persiste nome no Clerk e avança. handleSubmit só
  // chama isto com nome/sobrenome já preenchidos (schema); erro trava no campo.
  const continuarUser = u.form.handleSubmit(async (values) => {
    setErro(null);
    try {
      await u.persistName(values);
    } catch {
      // nome é best-effort no Clerk; não trava o fluxo
    }
    setStep("org");
  });

  // Provisiona o tenant SÍNCRONO: cria a Clerk Org (nome = solo? nome completo :
  // razão social) e ativa; a PRIMEIRA leitura de /identity/me já provisiona o tenant
  // na própria request (BE síncrono — sem webhook, sem poll, sem teto). O fetch
  // popula o cache que o useMe lê. Sobe o logo staged (firm, pela org recém-criada)
  // e avança. Erro em qualquer passo volta o controle na hora (try/catch).
  const criarTenant = useCallback(
    async (nome: string, next: OnbStep) => {
      if (phase !== "idle" || !isLoaded) return;
      setPhase("creating");
      try {
        let org = activeOrg ?? null;
        if (!org) {
          if (!createOrganization || !setActive) {
            setPhase("idle");
            return;
          }
          const created = await createOrganization({ name: nome });
          await setActive({ organization: created.id });
          org = created;
        }
        const me = await qc.fetchQuery({
          queryKey: [...ME_KEY, org.id],
          queryFn: () => getMe(api),
        });
        if (!me?.tenant_id) {
          throw new Error("provisionamento não devolveu tenant");
        }
        if (!solo && o.logoFile) {
          await org.setLogo({ file: o.logoFile }).catch(() => undefined);
        }
        setPhase("idle");
        setStep(next);
      } catch {
        setPhase("idle");
        setErro("Não foi possível preparar sua conta. Tente novamente.");
      }
    },
    [
      phase,
      isLoaded,
      activeOrg,
      createOrganization,
      setActive,
      solo,
      o.logoFile,
      qc,
      api,
    ],
  );

  // Passo 2 → 3: valida os campos do escritório (RHF/zod condicional por persona),
  // cria o tenant e vai pra OABs. handleSubmit só entra com os campos válidos.
  const continuarOrg = o.form.handleSubmit(async (values) => {
    if (phase !== "idle") return;
    setErro(null);
    const nome =
      values.persona === "solo"
        ? u.fullName() || "Meu escritório"
        : values.razaoSocial.trim();
    await criarTenant(nome, "oab");
  });

  // Grava o perfil (com account_type) → persiste as OABs (dispara DJEN) → convites do
  // time (best-effort) → done. O perfil é o gate; OABs/convites são allSettled.
  const concluir = useCallback(async () => {
    if (phase !== "idle" || !tenantReady || oabs.oabs.length === 0) return;
    const orgValues = o.form.getValues();
    setErro(null);
    setPhase("saving");
    try {
      await updateOrgProfile(
        solo
          ? { account_type: "solo" }
          : {
              account_type: "firm",
              cnpj: digits(orgValues.cnpj),
              legal_name: orgValues.razaoSocial.trim(),
              trade_name: orgValues.razaoSocial.trim(),
            },
      );

      const resOab = await Promise.allSettled(
        oabs.oabs.filter(Boolean).map((oab) => addWatchedOab(api, oab)),
      );
      setCapturasAtivadas(
        resOab.filter((r) => r.status === "fulfilled").length,
      );
      const oabFalhou = resOab.filter((r) => r.status === "rejected").length;

      let conviteFalhou = 0;
      if (!solo && team.rows.length > 0 && activeOrg) {
        const resInv = await Promise.allSettled(
          team.rows.map((r) =>
            inviteMember({
              organizationId: activeOrg.id,
              emailAddress: r.email,
              role: r.role === "ADMIN" ? "org:admin" : "org:member",
            }),
          ),
        );
        setConvitesEnviados(
          resInv.filter((r) => r.status === "fulfilled").length,
        );
        conviteFalhou = resInv.filter((r) => r.status === "rejected").length;
      }

      setPhase("idle");
      setStep("done");
      if (oabFalhou > 0 || conviteFalhou > 0) {
        const partes: string[] = [];
        if (oabFalhou > 0) partes.push(`${oabFalhou} OAB(s)`);
        if (conviteFalhou > 0) partes.push(`${conviteFalhou} convite(s)`);
        setErro(
          `Tudo pronto, mas ${partes.join(" e ")} não foram concluídos — refaça em Configurações.`,
        );
      }
    } catch {
      setPhase("idle");
      setErro("Não foi possível concluir agora. Tente de novo.");
    }
  }, [
    phase,
    tenantReady,
    oabs.oabs,
    solo,
    o.form,
    team.rows,
    activeOrg,
    updateOrgProfile,
    api,
  ]);

  // Passo 3 → 4 (autos): valida as OABs e segue para a INDUÇÃO de acesso ao
  // tribunal. Persistência de OABs/perfil/convites continua no `concluir` (fim).
  const continuarOab = useCallback(() => {
    if (oabs.oabs.length === 0) {
      setErro("Adicione ao menos uma OAB para ativar a captura.");
      return;
    }
    setErro(null);
    setStep("autos");
  }, [oabs.oabs.length]);

  // Passo 4 (autos) → (firm: time · solo: conclui). Nudge, não bloqueio: seguir
  // sem configurar o tribunal é uma escolha válida (adiar).
  const continuarAutos = useCallback(() => {
    setErro(null);
    if (solo) void concluir();
    else setStep("team");
  }, [solo, concluir]);

  // Passos visíveis pra barra de progresso (solo não tem "team").
  const visibleSteps: OnbStep[] = solo
    ? ["user", "org", "oab", "autos"]
    : ["user", "org", "oab", "autos", "team"];
  const idx = Math.max(0, visibleSteps.indexOf(step));

  return {
    step,
    solo,
    busy: phase !== "idle",
    saving: phase === "saving",
    erro,
    // progresso — dots (compat) + steps rotulados (barra legível)
    dots: visibleSteps.map((_, i) => idx >= i),
    steps: visibleSteps.map((s, i) => ({
      key: s,
      label: STEP_LABEL[s],
      done: idx > i,
      current: idx === i,
    })),
    // passo 1 — usuário (RHF)
    userForm: u.form,
    avatarUrl: u.avatarUrl,
    uploadAvatar: (f: File) => void u.uploadAvatar(f),
    savingAvatar: u.savingAvatar,
    continuarUser: () => void continuarUser(),
    // passo 2 — organização (RHF)
    orgForm: o.form,
    persona: o.persona,
    setPersona: (v: AccountType) =>
      o.form.setValue("persona", v, { shouldValidate: false }),
    cnpjLoading: o.cnpjLoading,
    onCnpjBlur: () => void o.onCnpjBlur(),
    logoPreview: o.logoPreview,
    stageLogo: o.stageLogo,
    voltarUser: () => setStep("user"),
    continuarOrg: () => void continuarOrg(),
    // passo 3 — oab (RHF no input de adicionar)
    oabForm: oabs.form,
    oabs: oabs.oabs,
    addOab: oabs.add,
    removeOab: oabs.remove,
    voltarOrg: () => setStep("org"),
    continuarOab,
    podeConcluir: oabs.oabs.length > 0,
    // passo 4 — autos (indução de acesso ao tribunal — nudge, não bloqueio)
    continuarAutos,
    voltarOabDeAutos: () => setStep("oab"),
    // passo 5 — time
    teamRows: team.rows,
    teamEmail: team.email,
    setTeamEmail: team.setEmail,
    teamRole: team.role,
    setTeamRole: team.setRole,
    addTeamRow: team.add,
    removeTeamRow: team.remove,
    voltarOab: () => setStep("autos"),
    concluir: () => void concluir(),
    // done
    capturasAtivadas,
    convitesEnviados,
    abrirApp: () => router.push("/triagem"),
  };
}
