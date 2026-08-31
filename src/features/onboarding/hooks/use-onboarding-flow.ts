"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { addWatchedOab } from "@/features/integrations/services/integrations.service";
import { useApi } from "@/lib/api/use-api";

import { useOnboarding } from "./use-onboarding";

// Fluxo de onboarding "Linear" (port de Atjus - Onboarding.dc.html): 4 passos
// welcome → org → oab → done. A UI é nova, mas a MECÂNICA de conclusão é a mesma
// do wizard antigo: cria a Clerk Organization → aguarda o BE provisionar o tenant
// (poll /identity/me) → grava o perfil (updateOrgProfile marca onboarding_completed_at).
export type OnbStep = "welcome" | "org" | "oab" | "done";
export type OnbRole = "novo" | "solo";
type Phase = "idle" | "creating" | "provisioning" | "saving";

const ORDER: OnbStep[] = ["welcome", "org", "oab", "done"];
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
      const v = atual.trim();
      if (v) setOabs((lista) => lista.concat(v));
      return "";
    });
  }, []);
  const remove = useCallback(
    (i: number) => setOabs((lista) => lista.filter((_, j) => j !== i)),
    [],
  );
  return { oab, setOab, oabs, setOabs, add, remove };
}

// ── sub-hook: checklist de próximos passos (passo done) ────────────────────────
function useChecklist() {
  const [chk, setChk] = useState<Record<string, boolean>>({});
  const toggle = useCallback(
    (k: string) => setChk((c) => ({ ...c, [k]: !c[k] })),
    [],
  );
  return { chk, toggle, reset: () => setChk({}) };
}

export function useOnboardingFlow() {
  const router = useRouter();
  const { isLoaded, createOrganization, setActive } = useOrganizationList();
  const { organization: activeOrg } = useOrganization();

  const [step, setStep] = useState<OnbStep>("welcome");
  const [phase, setPhase] = useState<Phase>("idle");
  const [erro, setErro] = useState<string | null>(null);

  const dados = useDados();
  const oabs = useOabs();
  const checklist = useChecklist();
  const api = useApi();

  const { tenantReady, updateOrgProfile } = useOnboarding({
    poll: phase === "provisioning",
  });

  // Grava o perfil mínimo → o BE marca onboarding_completed_at → persiste as OABs
  // como watched-oabs → avança pro done. O perfil é o gate do onboarding; as OABs
  // são best-effort (allSettled): falha de uma não trava a conclusão, mas o erro
  // (ApiError) fica visível pra o usuário reprocessar depois em Configurações.
  const salvarPerfil = useCallback(() => {
    const nome = dados.nome.trim() || "Meu escritório";
    const doc = digits(dados.doc) || digits(oabs.oabs[0] ?? "") || "0";
    const paraVigiar = oabs.oabs.map(normalizeOab).filter(Boolean);
    setPhase("saving");
    updateOrgProfile({ cnpj: doc, legal_name: nome, trade_name: nome })
      .then(async () => {
        const res = await Promise.allSettled(
          paraVigiar.map((oab) => addWatchedOab(api, oab)),
        );
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

  const concluir = useCallback(() => {
    if (oabs.oabs.length === 0) return;
    setErro(null);
    // Org já provisionada (usuário voltou) → grava direto.
    if (tenantReady || activeOrg) {
      salvarPerfil();
      return;
    }
    if (!isLoaded || !createOrganization || !setActive) return;
    setPhase("creating");
    createOrganization({ name: dados.nome.trim() || "Meu escritório" })
      .then((org) => setActive({ organization: org.id }))
      .then(() => setPhase("provisioning"))
      .catch(() => {
        setPhase("idle");
        setErro("Não foi possível criar a organização. Tente de novo.");
      });
  }, [
    oabs.oabs.length,
    tenantReady,
    activeOrg,
    isLoaded,
    createOrganization,
    setActive,
    dados.nome,
    salvarPerfil,
  ]);

  // Tenant provisionado durante o "provisioning" → grava o perfil e avança.
  useEffect(() => {
    if (phase !== "provisioning" || !tenantReady) return;
    salvarPerfil();
    // salvarPerfil é estável o bastante; evita re-disparo em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    irOab: () => setStep("oab"),
    // oab
    oab: oabs.oab,
    setOab: oabs.setOab,
    oabs: oabs.oabs,
    addOab: oabs.add,
    removeOab: oabs.remove,
    voltarOrg: () => setStep("org"),
    podeConcluir: oabs.oabs.length > 0,
    preparando: phase !== "idle",
    erro,
    concluir,
    // done
    chk: checklist.chk,
    toggleChk: checklist.toggle,
    abrirApp: () => router.push("/"),
    // topbar
    reiniciar: () => {
      setStep("welcome");
      setPhase("idle");
      setErro(null);
      dados.setRole(null);
      dados.setNome("");
      dados.setDoc("");
      oabs.setOab("");
      oabs.setOabs([]);
      checklist.reset();
    },
  };
}
