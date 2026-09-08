"use client";

import { useAuth, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { addWatchedOab } from "@/features/integrations/services/integrations.service";
import { useApi } from "@/lib/api/use-api";

import { useOnboarding } from "./use-onboarding";

// Fluxo guiado: welcome → org → access → oab → done. A UI é nova, mas a MECÂNICA de conclusão é a mesma
// do wizard antigo: cria a Clerk Organization → aguarda o BE provisionar o tenant
// (poll /identity/me) → grava o perfil (updateOrgProfile marca onboarding_completed_at).
export type OnbStep = "welcome" | "org" | "access" | "oab" | "done";
export type OnbRole = "novo" | "solo";
type Phase = "idle" | "creating" | "provisioning" | "saving";

const ORDER: OnbStep[] = ["welcome", "org", "access", "oab", "done"];
const STORED_STEPS = new Set<OnbStep>(ORDER);
const digits = (s: string) => s.replace(/\D/g, "");

// Normaliza a OAB digitada ("OAB/SP 214.885", "SP 214885", "214885/SP") pra
// chave canônica "UFNUMERO" que o BE espera (ex.: "SP214885"). Sem UF explícita,
// assume SP (default do produto). Só a UF de 2 letras + os dígitos entram.
function normalizeOab(raw: string): string {
  const semPrefixo = raw.replace(/oab/gi, "");
  const uf = (semPrefixo.match(/[A-Za-z]{2}/)?.[0] ?? "SP").toUpperCase();
  return uf + digits(semPrefixo);
}

// ── sub-hook: papel + campos da org ───────────────────────────────────────────
function useDados() {
  const [role, setRole] = useState<OnbRole | null>(null);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  return { role, setRole, nome, setNome, doc, setDoc };
}

// ── sub-hook: lista de OABs a vigiar ──────────────────────────────────────────
function useOabs() {
  const [oab, setOab] = useState("");
  const [oabs, setOabs] = useState<string[]>([]);
  const add = useCallback(() => {
    setOab((atual) => {
      const v = normalizeOab(atual);
      if (v && v.length > 2) {
        setOabs((lista) => (lista.includes(v) ? lista : lista.concat(v)));
      }
      return "";
    });
  }, []);
  const remove = useCallback(
    (i: number) => setOabs((lista) => lista.filter((_, j) => j !== i)),
    [],
  );
  return { oab, setOab, oabs, setOabs, add, remove };
}

export function useOnboardingFlow() {
  const router = useRouter();
  const { userId, orgId } = useAuth();
  const { isLoaded, createOrganization, setActive, userMemberships } =
    useOrganizationList({ userMemberships: { infinite: true } });
  const { organization: activeOrg } = useOrganization();

  const [step, setStep] = useState<OnbStep>("welcome");
  const [phase, setPhase] = useState<Phase>("idle");
  const [capturasAtivadas, setCapturasAtivadas] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const restoredStepFor = useRef<string | null>(null);

  const dados = useDados();
  const oabs = useOabs();
  const api = useApi();

  const { tenantReady, updateOrgProfile } = useOnboarding({
    poll: phase === "provisioning",
  });

  const stepStorageKey = userId ? `atjus:onboarding-step:${userId}` : null;

  // O progresso visual é local, mas fica isolado por Clerk user. Etapas que
  // dependem do tenant só são restauradas depois que a organização foi reativada
  // e seu org_id voltou ao token da sessão.
  useEffect(() => {
    if (!stepStorageKey || restoredStepFor.current === stepStorageKey) return;
    const stored = window.localStorage.getItem(
      stepStorageKey,
    ) as OnbStep | null;
    if (stored && STORED_STEPS.has(stored)) {
      if (!orgId && stored !== "welcome" && stored !== "org") return;
      queueMicrotask(() => setStep(stored));
    }
    restoredStepFor.current = stepStorageKey;
  }, [orgId, stepStorageKey]);

  useEffect(() => {
    if (!stepStorageKey || restoredStepFor.current !== stepStorageKey) return;
    window.localStorage.setItem(stepStorageKey, step);
  }, [step, stepStorageKey]);

  // Clerk allows a personal session even when the user already belongs to an
  // organization. That is exactly what happens after a hard refresh in this
  // deployment. Restore the existing membership before the wizard can create a
  // second organization; /identity/me only starts once the org claim is active.
  useEffect(() => {
    if (!isLoaded || orgId || phase !== "idle") return;
    const membership = userMemberships.data?.[0];
    if (!membership || !setActive) return;
    void setActive({ organization: membership.organization.id })
      .then(() => {
        setErro(null);
        setPhase("provisioning");
      })
      .catch(() => {
        setPhase("idle");
        setErro("Não foi possível restaurar o escritório. Tente novamente.");
      });
  }, [isLoaded, orgId, phase, setActive, userMemberships.data]);

  // Grava o perfil mínimo → o BE marca onboarding_completed_at → persiste as OABs
  // como watched-oabs → avança pro done. O perfil é o gate do onboarding; as OABs
  // são best-effort (allSettled): falha de uma não trava a conclusão, mas o erro
  // (ApiError) fica visível pra o usuário reprocessar depois em Configurações.
  const salvarPerfil = useCallback(() => {
    const nome = dados.nome.trim() || "Meu escritório";
    const doc = digits(dados.doc) || digits(oabs.oabs[0] ?? "") || "0";
    const paraVigiar = oabs.oabs.filter(Boolean);
    setPhase("saving");
    updateOrgProfile({ cnpj: doc, legal_name: nome, trade_name: nome })
      .then(async () => {
        const res = await Promise.allSettled(
          paraVigiar.map((oab) => addWatchedOab(api, oab)),
        );
        setCapturasAtivadas(res.filter((r) => r.status === "fulfilled").length);
        const falhou = res.filter((r) => r.status === "rejected").length;
        setPhase("idle");
        setStep("done");
        if (falhou > 0) {
          setErro(
            `Escritório criado. ${falhou} OAB(s) não puderam ser cadastradas — adicione-as depois em Configurações › Fontes.`,
          );
        }
      })
      .catch(() => {
        setPhase("idle");
        setErro("Não foi possível concluir agora. Tente de novo.");
      });
  }, [dados.nome, dados.doc, oabs.oabs, updateOrgProfile, api]);

  const prepararAcesso = useCallback(async () => {
    if (phase !== "idle") return;
    setErro(null);
    if (tenantReady) {
      setStep("access");
      return;
    }
    if (activeOrg) {
      setPhase("provisioning");
      return;
    }
    if (!isLoaded || !createOrganization || !setActive) return;
    setPhase("creating");
    try {
      const org = await createOrganization({
        name: dados.nome.trim() || "Meu escritório",
      });
      await setActive({ organization: org.id });
      setPhase("provisioning");
    } catch {
      setPhase("idle");
      setErro("Não foi possível preparar o escritório. Tente novamente.");
    }
  }, [
    phase,
    tenantReady,
    activeOrg,
    isLoaded,
    createOrganization,
    setActive,
    dados.nome,
  ]);

  const concluir = useCallback(() => {
    if (oabs.oabs.length === 0 || phase !== "idle" || !tenantReady) return;
    setErro(null);
    salvarPerfil();
  }, [oabs.oabs.length, phase, tenantReady, salvarPerfil]);

  useEffect(() => {
    if (phase === "provisioning" && tenantReady) {
      setPhase("idle");
      setStep("access");
    }
  }, [phase, tenantReady]);

  // Teto do provisionamento (~40s) — devolve o controle em vez de pollar pra sempre.
  useEffect(() => {
    if (phase !== "provisioning") return;
    const timer = setTimeout(() => {
      setPhase("idle");
      setErro("Demorou demais para preparar a conta. Tente de novo.");
    }, 40_000);
    return () => clearTimeout(timer);
  }, [phase]);

  const idx = Math.max(0, ORDER.indexOf(step));

  return {
    step,
    role: dados.role,
    // barra de progresso (passos 2-4)
    temDots: step !== "welcome",
    dots: ORDER.slice(1).map((_, i) => idx >= i + 1),
    // welcome
    escolherPapel: (r: OnbRole) => {
      dados.setRole(r);
      setStep("org");
    },
    // org
    nome: dados.nome,
    setNome: dados.setNome,
    doc: dados.doc,
    setDoc: dados.setDoc,
    voltarWelcome: () => {
      dados.setRole(null);
      setStep("welcome");
    },
    prepararAcesso,
    irOab: () => setStep("oab"),
    // oab
    oab: oabs.oab,
    setOab: oabs.setOab,
    oabs: oabs.oabs,
    addOab: oabs.add,
    removeOab: oabs.remove,
    voltarOrg: () => setStep("access"),
    podeConcluir: oabs.oabs.length > 0,
    preparando: phase !== "idle",
    erro,
    concluir,
    // done
    capturasAtivadas,
    abrirApp: () => router.push("/triagem"),
  };
}
