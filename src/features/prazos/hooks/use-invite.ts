"use client";

import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  roleLabel as clerkRoleLabel,
  useOrgMembers,
} from "@/features/organization/hooks/use-org-members";

// Só e-mail e mensagem são campos de formulário RHF. O e-mail é validado por
// campo (formato) ao adicionar um convidado; a mensagem é livre/opcional. Chips,
// papel e "pode protocolar" seguem como estado de UI (fidelidade ao design).
const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Informe um e-mail válido.",
    }),
  msg: z.string(),
});

export type InviteForm = z.infer<typeof inviteSchema>;

// Modal "Convidar membro" (port de Atjus - Convite.dc.html, persona admin):
// chips de e-mail → papel → "pode protocolar" → mensagem → enviar. Ligado ao
// Clerk REAL: cada e-mail vira um organization.inviteMember({emailAddress, role});
// os pendentes vêm de useOrganization().invitations (revogáveis). O Clerk envia o
// e-mail de aceite — não há "link compartilhável" próprio, então a tela de sucesso
// confirma o envio sem fabricar link. "Pode protocolar" e "Mensagem" ficam na UI
// (fidelidade ao design), mas ainda NÃO são enviados: o Clerk client inviteMember
// não aceita mensagem, e o claim de protocolar depende de plumbing de BE.
export type Papel = "Sócio" | "Advogado" | "Estagiário";

// Só existem DOIS papéis reais no Clerk/BE hoje (org:admin→ADMIN, org:member→
// LAWYER). O design tem três cards; mapeamos Sócio→admin e Advogado/Estagiário→
// member até "Estagiário" virar um papel de fato configurado.
const PAPEL_DEFS: {
  k: Papel;
  label: string;
  desc: string;
  cor: string;
  role: OrganizationCustomRoleKey;
}[] = [
  {
    k: "Sócio",
    label: "Sócio",
    desc: "Acesso total · protocola e gerencia o escritório",
    cor: "var(--primary)",
    role: "org:admin" as OrganizationCustomRoleKey,
  },
  {
    k: "Advogado",
    label: "Advogado",
    desc: "Trabalha prazos e peças · protocola se permitido",
    cor: "var(--fg2)",
    role: "org:member" as OrganizationCustomRoleKey,
  },
  {
    k: "Estagiário",
    label: "Estagiário",
    desc: "Apoia na redação · não protocola",
    cor: "var(--gold)",
    role: "org:member" as OrganizationCustomRoleKey,
  },
];

export interface InvitePendente {
  id: string;
  email: string;
  papel: string;
  reenviar: () => void;
  revogando: boolean;
}

export function useInvite() {
  const { organization, invitations, isAdmin } = useOrgMembers();
  const [aberto, setAberto] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [papel, setPapel] = useState<Papel>("Advogado");
  const [proto, setProto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);
  const [totalEnviados, setTotalEnviados] = useState(0);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    mode: "onSubmit",
    defaultValues: { email: "", msg: "" },
  });
  const { reset, getValues, setValue, setError, clearErrors, control } = form;
  const email = useWatch({ control, name: "email" });

  const abrir = useCallback(() => {
    setAberto(true);
    setEnviado(false);
    setErroEnvio(null);
    setChips([]);
    reset({ email: "", msg: "" });
  }, [reset]);
  const fechar = useCallback(() => setAberto(false), []);

  // Adiciona o e-mail digitado à lista de convidados (chip). Valida o formato
  // por campo: se inválido, mostra a mensagem abaixo do input e NÃO adiciona.
  const addEmail = useCallback(() => {
    const t = getValues("email").trim();
    if (!t) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      setError("email", {
        type: "manual",
        message: "Informe um e-mail válido.",
      });
      return;
    }
    clearErrors("email");
    setChips((c) => c.concat(t));
    setValue("email", "");
  }, [getValues, setError, clearErrors, setValue]);
  const removeChip = useCallback(
    (i: number) => setChips((c) => c.filter((_, j) => j !== i)),
    [],
  );

  const podeEnviar =
    !enviando && (chips.length > 0 || (email ?? "").trim().includes("@"));

  const enviar = useCallback(async () => {
    if (!organization) return;
    const extra = getValues("email").trim();
    if (extra && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extra)) {
      setError("email", {
        type: "manual",
        message: "Informe um e-mail válido.",
      });
      return;
    }
    const todos = (extra ? chips.concat(extra) : chips.slice()).map((e) =>
      e.toLowerCase(),
    );
    if (todos.length === 0) return;
    const role =
      PAPEL_DEFS.find((p) => p.k === papel)?.role ??
      ("org:member" as OrganizationCustomRoleKey);

    setEnviando(true);
    setErroEnvio(null);
    const res = await Promise.allSettled(
      todos.map((emailAddress) =>
        organization.inviteMember({ emailAddress, role }),
      ),
    );
    void invitations?.revalidate?.();
    const falhou = res.filter((r) => r.status === "rejected").length;
    setEnviando(false);
    setTotalEnviados(todos.length - falhou);
    if (falhou === todos.length) {
      setErroEnvio(
        "Não foi possível enviar. Verifique os e-mails (podem já ser membros ou ter convite pendente).",
      );
      return;
    }
    if (falhou > 0) {
      setErroEnvio(
        `${falhou} de ${todos.length} convites falharam (já são membros ou têm convite pendente).`,
      );
    }
    setChips([]);
    reset({ email: "", msg: "" });
    setEnviado(true);
  }, [organization, invitations, getValues, chips, papel, reset, setError]);

  const revogar = useCallback(
    async (
      inv: NonNullable<NonNullable<typeof invitations>["data"]>[number],
    ) => {
      setRevogandoId(inv.id);
      try {
        await inv.revoke();
        void invitations?.revalidate?.();
      } finally {
        setRevogandoId(null);
      }
    },
    [invitations],
  );

  const papeis = useMemo(
    () =>
      PAPEL_DEFS.map((p) => {
        const on = papel === p.k;
        return {
          k: p.k,
          label: p.label,
          desc: p.desc,
          pick: () => setPapel(p.k),
          borda: on ? "var(--primary)" : "var(--line)",
          bg: on ? "var(--selected)" : "var(--bg)",
          ring: on ? "var(--primary)" : "var(--line)",
          dot: on ? "var(--primary)" : "transparent",
        };
      }),
    [papel],
  );

  const pendentes = useMemo<InvitePendente[]>(
    () =>
      (invitations?.data ?? []).map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        papel: clerkRoleLabel(inv.role),
        reenviar: () => void revogar(inv),
        revogando: revogandoId === inv.id,
      })),
    [invitations?.data, revogandoId, revogar],
  );

  const totalCompondo = chips.length + ((email ?? "").includes("@") ? 1 : 0);

  return {
    aberto,
    abrir,
    fechar,
    isAdmin,
    sub: enviado
      ? "Convite enviado."
      : "Eles recebem um e-mail para entrar no escritório.",
    compondo: !enviado,
    enviado,
    enviando,
    erroEnvio,
    form,
    addEmail,
    chips: chips.map((e, i) => ({ email: e, rm: () => removeChip(i) })),
    temChips: chips.length > 0,
    papeis,
    proto,
    protoTrilho: proto ? "var(--primary)" : "var(--line)",
    protoKnob: proto ? "translateX(16px)" : "translateX(0)",
    toggleProto: () => setProto((p) => !p),
    podeEnviar,
    enviar: () => void enviar(),
    enviadoTitulo: totalEnviados > 1 ? "Convites enviados" : "Convite enviado",
    enviadoMsg:
      "Eles recebem um e-mail com o link de aceite para criar a conta e entrar no escritório.",
    totalCompondo,
    pendentes,
  };
}
