"use client";

import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { inviteMember } from "@/features/organization/actions/invite-member";
import {
  listTeamInvitations,
  replaceExpiredTeamInvitation,
  resendTeamInvitation,
  revokeTeamInvitation,
} from "@/features/organization/actions/team-invitations";
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
// Clerk REAL: cada e-mail é enviado no servidor com redirect para /convite;
// o histórico de convites vem da listagem paginada do Clerk no servidor. O Clerk envia o
// e-mail de aceite — não há "link compartilhável" próprio, então a tela de sucesso
// confirma o envio sem fabricar link. "Pode protocolar" e "Mensagem" ficam na UI
// (fidelidade ao design), mas ainda NÃO são enviados: o fluxo atual
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

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface InvitePendente {
  id: string;
  email: string;
  papel: string;
  status: InvitationStatus | null;
  reenviar: () => void;
  revogar: () => void;
  busy: "resend" | "revoke" | "replace" | null;
  error: string | null;
}

export function useInvite() {
  const { organization, isAdmin } = useOrgMembers();
  const qc = useQueryClient();
  const [status, setStatus] = useState<InvitationStatus>("pending");
  const orgId = organization?.id ?? null;
  const [pageState, setPageState] = useState<{
    orgId: string | null;
    page: number;
  }>({ orgId, page: 0 });
  const page = pageState.orgId === orgId ? pageState.page : 0;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<{
    id: string;
    action: "resend" | "revoke" | "replace";
  } | null>(null);
  const [notice, setNotice] = useState<{
    orgId: string;
    message: string;
  } | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const invitationQuery = useQuery({
    queryKey: ["organization", "invitations", orgId, status, page],
    queryFn: () => listTeamInvitations(orgId ?? "", status, page),
    enabled: !!orgId,
  });
  const pageOutOfRange =
    invitationQuery.isSuccess &&
    page > 0 &&
    page * 20 >= invitationQuery.data.totalCount;
  useEffect(() => {
    if (!pageOutOfRange || !orgId) return;
    const lastPage = Math.max(
      0,
      Math.ceil(invitationQuery.data.totalCount / 20) - 1,
    );
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPageState({ orgId, page: lastPage });
    });
    return () => {
      cancelled = true;
    };
  }, [pageOutOfRange, invitationQuery.data?.totalCount, orgId]);
  const refreshInvitations = useCallback(
    () =>
      qc.invalidateQueries({
        queryKey: ["organization", "invitations", orgId],
      }),
    [qc, orgId],
  );
  const [aberto, setAberto] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [papel, setPapel] = useState<Papel>("Advogado");
  const [proto, setProto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
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
        inviteMember({ organizationId: organization.id, emailAddress, role }),
      ),
    );
    void refreshInvitations();
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
  }, [
    organization,
    refreshInvitations,
    getValues,
    chips,
    papel,
    reset,
    setError,
  ]);

  const runInvitationAction = useCallback(
    async (id: string, action: "resend" | "revoke" | "replace") => {
      if (!isAdmin || busyRef.current) return;
      busyRef.current = true;
      setBusy({ id, action });
      setRowError(null);
      setNotice(null);
      try {
        if (action === "revoke") {
          await revokeTeamInvitation(id);
          toast.success("Convite revogado.");
        } else if (action === "resend") {
          const result = await resendTeamInvitation(id);
          if (!result.sent) {
            const message =
              "O convite anterior foi revogado, mas o novo envio falhou. Convide a pessoa novamente.";
            setRowError({ id, message });
            if (organization?.id)
              setNotice({ orgId: organization.id, message });
            toast.error(message);
            return;
          }
          toast.success("Novo convite solicitado ao Clerk.");
        } else {
          await replaceExpiredTeamInvitation(id);
          toast.success("Novo convite solicitado ao Clerk.");
        }
      } catch {
        const message =
          action === "revoke"
            ? "Não foi possível revogar o convite. Tente novamente."
            : "Não foi possível solicitar um novo convite. Tente novamente.";
        setRowError({ id, message });
        toast.error(message);
      } finally {
        await refreshInvitations();
        busyRef.current = false;
        setBusy(null);
      }
    },
    [isAdmin, refreshInvitations, organization?.id],
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
      (invitationQuery.data?.data ?? []).map((inv) => {
        const effectiveStatus = inv.status;
        return {
          id: inv.id,
          email: inv.email,
          papel: clerkRoleLabel(inv.role),
          status: effectiveStatus,
          reenviar: () =>
            void runInvitationAction(
              inv.id,
              effectiveStatus === "expired" ? "replace" : "resend",
            ),
          revogar: () => void runInvitationAction(inv.id, "revoke"),
          busy: busy?.id === inv.id ? busy.action : null,
          error: rowError?.id === inv.id ? rowError.message : null,
        };
      }),
    [invitationQuery.data, busy, rowError, runInvitationAction],
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
    invitationNotice:
      notice && notice.orgId === organization?.id ? notice.message : null,
    invitationStatus: status,
    setInvitationStatus: (next: InvitationStatus) => {
      setStatus(next);
      setPageState({ orgId, page: 0 });
      setRowError(null);
      setNotice(null);
    },
    invitationPage: page,
    invitationTotal: invitationQuery.data?.totalCount ?? 0,
    invitationLoading:
      invitationQuery.isPending || invitationQuery.isFetching || pageOutOfRange,
    invitationError: invitationQuery.error,
    nextInvitationPage: () => setPageState({ orgId, page: page + 1 }),
    previousInvitationPage: () =>
      setPageState({ orgId, page: Math.max(0, page - 1) }),
  };
}
