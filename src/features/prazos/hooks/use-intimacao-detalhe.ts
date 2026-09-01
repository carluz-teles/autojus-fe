"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import {
  useAnalisarIntimacao,
  useAssignIntimacaoResponsavel,
  useIgnorarIntimacao,
  useIntimacaoDetalhe as useIntimacaoDetalheQuery,
  useReabrirIntimacao,
  useResolverIntimacao,
} from "@/features/intimacoes/hooks/use-intimacoes";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import { tituloIntimacao } from "@/features/intimacoes/lib/titulo";
import type {
  IntimacaoDetalheView,
  IntimacaoUserStatus,
} from "@/features/intimacoes/types";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { formatarData } from "@/lib/utils";

// ── helpers puros (rótulos/datas) ────────────────────────────────────────────

/** user_status → rótulo + cor (token). PENDING gold, RESOLVED green, IGNORED fg3. */
function userStatusInfo(s: IntimacaoUserStatus): {
  label: string;
  cor: string;
  fundo: string;
} {
  if (s === "RESOLVED")
    return {
      label: "Resolvida",
      cor: "var(--green)",
      fundo: "color-mix(in oklch, var(--green) 10%, transparent)",
    };
  if (s === "IGNORED")
    return {
      label: "Ignorada",
      cor: "var(--fg3)",
      fundo: "color-mix(in oklch, var(--fg3) 12%, transparent)",
    };
  return {
    label: "Pendente",
    cor: "var(--gold)",
    fundo: "color-mix(in oklch, var(--gold) 13%, transparent)",
  };
}

/** prazo (days_left) → número + frase + cor. null = "sem prazo"/fg3. */
function prazoInfo(daysLeft: number | null): {
  num: string;
  frase: string;
  cor: string;
} {
  if (daysLeft === null)
    return { num: "—", frase: "sem prazo", cor: "var(--fg3)" };
  if (daysLeft < 0)
    return { num: String(-daysLeft), frase: "d em atraso", cor: "var(--red)" };
  if (daysLeft === 0)
    return { num: "hoje", frase: "vence hoje", cor: "var(--gold)" };
  return { num: String(daysLeft), frase: "dias restantes", cor: "var(--fg2)" };
}

/** Data curta "DD/MM" a partir de um ISO date/timestamp (UTC). */
function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// Etapas do ciclo de vida da triagem (stepper). PENDING → RESOLVED; IGNORED é
// um estado terminal alternativo. O stepper marca até onde a intimação chegou.
const CICLO: { key: IntimacaoUserStatus; label: string }[] = [
  { key: "PENDING", label: "Pendente" },
  { key: "RESOLVED", label: "Resolvida" },
];

// ── modelo derivado (VM que o componente consome) ────────────────────────────

function useModel(i: IntimacaoDetalheView | undefined) {
  const { members } = useOrgMembersDirectory();

  return useMemo(() => {
    if (!i) return null;

    const status = userStatusInfo(i.user_status);
    const prazo = prazoInfo(i.prazo?.days_left ?? null);
    const ignorada = i.user_status === "IGNORED";

    // Ciclo de vida: o índice "atual" é a etapa alcançada. IGNORED fica só na
    // primeira etapa (não passou por RESOLVED) e a marca como terminal.
    const atual = i.user_status === "RESOLVED" ? 1 : 0;
    const stepper = CICLO.map((s, idx) => ({
      key: s.key,
      label: idx === 0 && ignorada ? "Ignorada" : s.label,
      cor:
        idx === atual ? "var(--fg)" : idx < atual ? "var(--fg2)" : "var(--fg3)",
      temLinha: idx < CICLO.length - 1,
      linhaCor: idx < atual ? "var(--primary)" : "var(--line)",
      flex: idx < CICLO.length - 1 ? 1 : 0,
    }));

    // Responsável: nome resolvido pelo join do BE ou pelo diretório (nunca id cru).
    const membro = i.assignee_user_id
      ? members.find((m) => m.id === i.assignee_user_id)
      : undefined;
    const responsavelNome =
      i.assignee_user_name?.trim() ||
      (membro ? nomeExibicao(membro.name, membro.email) : "");

    // Providências visíveis = tudo menos DISCARDED. Endereçadas por `id` — não mais
    // por índice (action_item é uma tabela real agora, ver types.ts).
    const providencias = i.ai_providencias.filter(
      (p) => p.status !== "DISCARDED",
    );

    const analisada = i.ai_analyzed_at !== null;
    const degradado = analisada && !i.ai_summary?.trim();

    return {
      id: i.id,
      cnj: i.cnj_number,
      courtRecordId: i.court_record_id,
      titulo: tituloIntimacao(i),
      tipoLabel: TYPE_LABEL[i.type],
      orgao: i.judging_body || i.court,
      publicadoEm: i.published_at ? formatarData(i.published_at) : "—",

      // Contexto do processo (usado no rail da Construção/partida da peça).
      classe: i.class,
      assunto: i.subject,
      tribunal: i.court,
      tribunalGrau: [i.court, i.degree].filter(Boolean).join(" · "),
      // Destinatários (advogados endereçados) — "Partes/Procuradores" no rail.
      destinatarios: i.recipients.map((r) => ({
        nome: r.name,
        oab: [r.oab_number, r.oab_uf].filter(Boolean).join("/"),
        matched: r.matched,
      })),

      // ciclo de vida (badge de situação + stepper)
      statusLabel: status.label,
      statusCor: status.cor,
      statusFundo: status.fundo,
      stepper,

      // prazo (contador grande)
      prazoNum: prazo.num,
      prazoFrase: prazo.frase,
      prazoCor: prazo.cor,
      prazoConfirmado: i.prazo?.confirmed ?? false,

      // IA (pré vs pós-análise)
      analisada,
      degradado,
      resumo: i.ai_summary?.trim() ?? "",
      analisadaEm: i.ai_analyzed_at ? formatarData(i.ai_analyzed_at) : "",
      providencias,
      nProvidencias: providencias.length,

      // teor completo + trilha
      teor: i.content?.trim() ?? "",
      trilha: i.history.map((h) => ({
        data: dataCurta(h.occurred_at),
        label: h.label,
      })),

      // responsável
      responsavelId: i.assignee_user_id,
      responsavelNome,

      // triagem
      userStatus: i.user_status,
      podeReabrir: i.user_status === "RESOLVED" || i.user_status === "IGNORED",
    };
  }, [i, members]);
}

// Hook público do detalhe da intimação (unidade de trabalho). Compõe os hooks
// reais da feature intimacoes e expõe uma VM limpa + handlers para a UI ligar.
export function useIntimacaoDetalhe(id: string) {
  const query = useIntimacaoDetalheQuery(id);
  const i = query.data;

  const model = useModel(i);

  const analisar = useAnalisarIntimacao(id);
  const resolver = useResolverIntimacao();
  const ignorar = useIgnorarIntimacao();
  const reabrir = useReabrirIntimacao();
  const assign = useAssignIntimacaoResponsavel(id);
  const membros = useOrgMembersDirectory();

  const onAnalisar = () =>
    analisar.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível gerar a análise. Tente novamente."),
    });

  const onResolver = () =>
    resolver.mutate(id, {
      onSuccess: () => toast.success("Intimação resolvida."),
      onError: () => toast.error("Não foi possível resolver. Tente novamente."),
    });

  const onIgnorar = () =>
    ignorar.mutate(id, {
      onSuccess: () => toast.success("Intimação ignorada."),
      onError: () => toast.error("Não foi possível ignorar. Tente novamente."),
    });

  const onReabrir = () =>
    reabrir.mutate(id, {
      onSuccess: () => toast.success("Intimação reaberta."),
      onError: () => toast.error("Não foi possível reabrir. Tente novamente."),
    });

  const onAssign = (assigneeUserId: string | null) =>
    assign.mutate(
      { assigneeUserId },
      {
        onError: () => toast.error("Não foi possível salvar o responsável."),
      },
    );

  return {
    isPending: query.isPending,
    isError: query.isError,
    model,

    // IA
    analisando: analisar.isPending,
    analiseErro: analisar.isError,
    onAnalisar,

    // triagem
    onResolver,
    onIgnorar,
    onReabrir,
    triagemEmVoo: resolver.isPending || ignorar.isPending || reabrir.isPending,

    // responsável
    membros: membros.members,
    onAssign,
    assignEmVoo: assign.isPending,
  };
}
