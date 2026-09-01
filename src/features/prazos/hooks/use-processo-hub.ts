"use client";

import { useCallback, useMemo } from "react";

import { useAndamentosDoProcesso } from "@/features/andamentos/hooks/use-andamentos-do-processo";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";
import {
  rotuloTipoAuto,
  visualDoAuto,
} from "@/features/documentos/lib/tipo-autos";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao } from "@/features/organization/lib/labels";
import { usePecasByProcesso } from "@/features/pecas/hooks/use-peca";
import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import {
  useIntimacoesByProcesso,
  usePrazosByProcesso,
} from "@/features/processos/hooks/use-processo-tabs";
import {
  useAssignResponsavel,
  usePartes,
  useProcesso,
  useUpdateProcessoManual,
} from "@/features/processos/hooks/use-processos";
import type {
  Party,
  ProcessoDegree,
  ProcessoPhase,
} from "@/features/processos/types";
import { formatDate } from "@/lib/format";

import { iniciais } from "../lib/derivar";

// PROCESSO · HUB — cockpit do caso, agora ligado ao BACKEND REAL. O hook público
// compõe os hooks de dados reais (detalhe, resumo IA, partes, andamentos e as abas
// de referência) e expõe uma VM limpa; o componente só faz JSX + binding.

// ── Rótulos / cores (labels PT-BR) ─────────────────────────────────────────────

const DEGREE_LABEL: Record<ProcessoDegree, string> = {
  G1: "1º grau",
  G2: "2º grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "—",
};

// As 5 fases do stepper, em ordem, com rótulo pt-BR — fonte única do stepper e do label.
const FASE_STEPS: { key: ProcessoPhase; label: string }[] = [
  { key: "CONHECIMENTO", label: "Conhecimento" },
  { key: "INSTRUCAO", label: "Instrução" },
  { key: "SENTENCA", label: "Sentença" },
  { key: "RECURSO", label: "Recurso" },
  { key: "EXECUCAO", label: "Execução" },
];

// Formata um valor da causa em reais ("R$ 128.400,00"); null quando não preenchido.
function formatBRL(v: number | null): string | null {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface LifecycleInfo {
  label: string;
  cor: string;
}

// Situação do processo → rótulo PT-BR + cor de token. ACTIVE→verde, SUSPENDED→gold,
// ARCHIVED→fg3; demais estados caem no neutro.
function lifecycleInfo(lifecycle: string): LifecycleInfo {
  switch (lifecycle) {
    case "ACTIVE":
      return { label: "Em andamento", cor: "var(--green)" };
    case "SUSPENDED":
      return { label: "Suspenso", cor: "var(--gold)" };
    case "ARCHIVED":
      return { label: "Arquivado", cor: "var(--fg3)" };
    default:
      return { label: lifecycle || "—", cor: "var(--fg2)" };
  }
}

const mix = (cor: string, pct: number) =>
  `color-mix(in oklch, ${cor} ${pct}%, transparent)`;

// Contagem regressiva curta a partir de days_left (negativo = atraso).
function prazoCurto(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)}d atraso`;
  if (dias === 0) return "hoje";
  return `${dias}d`;
}

// Cor de token do prazo por dias restantes (vencido/hoje = red, ≤3 = gold, resto = green).
function urgCorPorDias(dias: number): string {
  if (dias <= 0) return "var(--red)";
  if (dias <= 3) return "var(--gold)";
  return "var(--green)";
}

// Nível 0-3 das barrinhas de sinal ao lado do card (3 = vencido, 0 = tranquilo).
function urgNivelPorDias(dias: number): number {
  if (dias < 0) return 3;
  if (dias <= 3) return 2;
  if (dias <= 7) return 1;
  return 0;
}

interface PecaStatusVM {
  label: string;
  cor: string;
  fundo: string;
}

// Status da peça (DRAFT|SIGNED|FILED|DISCARDED) → rótulo + cores do badge.
function pecaStatusInfo(status: string): PecaStatusVM {
  switch (status) {
    case "FILED":
      return {
        label: "Protocolada",
        cor: "var(--green)",
        fundo: mix("var(--green)", 14),
      };
    case "SIGNED":
      return {
        label: "Assinada",
        cor: "var(--blue)",
        fundo: mix("var(--blue)", 14),
      };
    case "DISCARDED":
      return { label: "Descartada", cor: "var(--fg3)", fundo: "var(--hover)" };
    default:
      return {
        label: "Rascunho",
        cor: "var(--gold)",
        fundo: mix("var(--gold)", 16),
      };
  }
}

// Cor de token do ícone da peça, por tipo (piece_type do BE). Defesa/Petição azul,
// Petição inicial verde, Recurso/Reconvenção âmbar; desconhecido neutro.
function corDaPeca(pieceType: string): string {
  switch (pieceType) {
    case "COMPLAINT":
      return "var(--green)";
    case "APPEAL":
    case "COUNTERCLAIM":
      return "var(--gold)";
    case "DEFENSE":
    case "MOTION":
    case "PETITION":
    case "MANIFESTATION":
      return "var(--blue)";
    default:
      return "var(--fg3)";
  }
}

// ── Tipos da VM ────────────────────────────────────────────────────────────────

export interface TagChip {
  label: string;
  cor: string;
  fundo: string;
}

export interface IdentityVM {
  cnj: string;
  /** Título grande — a classe processual (fallback assunto/CNJ). */
  titulo: string;
  /** Assunto do processo, quando houver. */
  subject: string;
  tags: TagChip[];
  degreeLabel: string;
  lifecycleLabel: string;
  lifecycleCor: string;
  court: string;
  judgingBody: string;
  distribuido: string;
  completeness: number;
  /** Fase efetiva do processo (pro stepper); null quando ainda não derivada/definida. */
  phase: ProcessoPhase | null;
  /** Valor da causa formatado ("R$ 128.400,00") ou null quando não preenchido. */
  valor: string | null;
  /** Valor da causa cru (pra edição inline); null quando não preenchido. */
  valorRaw: number | null;
}

// Um passo do stepper de fase (Conhecimento→…→Execução).
export interface FaseStepVM {
  key: ProcessoPhase;
  label: string;
  /** "done" (passado), "current" (fase atual) ou "todo" (futuro). */
  estado: "done" | "current" | "todo";
  onClick: () => void;
}

export interface ResponsavelVM {
  nome: string;
  iniciais: string;
  assignedUserId: string | null;
}

export interface MemberOption {
  id: string;
  /** Rótulo pronto pra exibir: nome, ou e-mail quando o nome está vazio. */
  label: string;
}

export interface IntimacaoItemVM {
  id: string;
  titulo: string;
  /** "A confirmar" | "Intimação recebida" — situação de triagem do prazo. */
  status: string;
  /** Nome do responsável desta intimação ("resp. Fulano") ou null. */
  resp: string | null;
  /** Data fatal do prazo derivado ("04/09") ou "" quando não há prazo. */
  fatal: string;
  /** Contagem regressiva curta ("1d atraso" | "hoje" | "11d") ou null. */
  prazoCurto: string | null;
  /** Nível de urgência 0-3 para as barrinhas de sinal (0 ok → 3 vencido). */
  urgNivel: number;
  urgCor: string;
}

export interface PrazoItemVM {
  id: string;
  kind: string;
  /** Data de início ("interno 02/09") — start_date do prazo. */
  interno: string;
  /** Data fatal ("fatal 04/09") — end_date do prazo. */
  fatal: string;
  prazoCurto: string;
  urgNivel: number;
  urgCor: string;
}

export interface AutoItemVM {
  id: string;
  /** Nome do auto (rico: "Petição inicial", "Despacho saneador"…). */
  titulo: string;
  /** Sublinha "Categoria · Origem" (ex.: "Petição · Parte", "Decisão · Juízo"). */
  sub: string;
  /** Cor de token do ícone, por categoria (Petição/Decisão azul, Documento verde…). */
  cor: string;
  /** "12 fls." (contagem de páginas) ou "" quando desconhecida. */
  fls: string;
  /** true enquanto o doc ainda está sendo extraído/indexado. */
  processando: boolean;
}

export interface AutosVM {
  itens: AutoItemVM[];
  total: number;
  /** Total de folhas (soma das páginas) — "530 fls." no cabeçalho. */
  folhas: number;
  isPending: boolean;
  isEmpty: boolean;
  /** Abre o documento numa nova aba (presigned GET de curta duração). */
  abrir: (documentoId: string) => void;
}

export interface PecaItemVM {
  id: string;
  titulo: string;
  /** Descrição: o tipo da peça (Defesa, Petição inicial, Recurso…) — o "nome + descrição". */
  sub: string;
  /** Cor de token do ícone, por tipo de peça. */
  cor: string;
  data: string;
  statusLabel: string;
  statusCor: string;
  statusFundo: string;
}

export interface PecasVM {
  itens: PecaItemVM[];
  total: number;
  isPending: boolean;
  isEmpty: boolean;
}

export interface ParteItemVM {
  papel: string;
  nome: string;
  proc: string;
  documento: string;
}

export interface AndamentoItemVM {
  id: string;
  data: string;
  texto: string;
}

// ── Sub-hooks privados (um por responsabilidade) ────────────────────────────────

// Detalhe + identidade do processo. Deriva os fatos-chave e as tags do ProcessoView.
function useIdentidade_private(id: string) {
  const q = useProcesso(id);
  const p = q.data;

  const identity: IdentityVM | null = useMemo(() => {
    if (!p) return null;
    const life = lifecycleInfo(p.lifecycle);
    const tags: TagChip[] = [];
    if (p.class)
      tags.push({ label: p.class, cor: "var(--fg2)", fundo: "var(--hover)" });
    if (p.court)
      tags.push({ label: p.court, cor: "var(--fg2)", fundo: "var(--hover)" });
    tags.push({
      label: life.label,
      cor: life.cor,
      fundo: mix(life.cor, 12),
    });
    return {
      cnj: p.cnj_number,
      titulo: p.class || p.subject || p.cnj_number,
      subject: p.subject,
      tags,
      degreeLabel: DEGREE_LABEL[p.degree] ?? "—",
      lifecycleLabel: life.label,
      lifecycleCor: life.cor,
      court: p.court,
      judgingBody: p.judging_body,
      distribuido: formatDate(p.filed_at),
      completeness: p.completeness,
      phase: p.phase,
      valor: formatBRL(p.claim_value),
      valorRaw: p.claim_value,
    };
  }, [p]);

  return {
    processo: p ?? null,
    identity,
    isLoading: q.isLoading,
    isError: q.isError,
    naoEncontrado: !q.isLoading && !q.isError && !p,
  };
}

// Responsável: nome (resolvido pelo diretório quando o BE não anexou) + controle de
// atribuição (menu simples ligado à mutation e ao diretório de membros).
function useResponsavel_private(
  id: string,
  assignedUserId: string | null | undefined,
) {
  const dir = useOrgMembersDirectory();
  const assign = useAssignResponsavel(id);

  const nome =
    (assignedUserId && dir.nameFor(assignedUserId)) || "Não atribuído";

  const responsavel: ResponsavelVM = {
    nome,
    iniciais: assignedUserId ? iniciais(nome) : "—",
    assignedUserId: assignedUserId ?? null,
  };

  const members: MemberOption[] = dir.members.map((m) => ({
    id: m.id,
    label: nomeExibicao(m.name, m.email),
  }));

  return {
    responsavel,
    members,
    assign: (userId: string | null) => assign.mutate(userId),
    isAssigning: assign.isPending,
  };
}

// Partes agrupadas por polo → lista plana pronta pra bindar (Autor/Réu/Terceiro).
function usePartes_private(id: string) {
  const q = usePartes(id);
  const data = q.data;

  const partes: ParteItemVM[] = useMemo(() => {
    if (!data) return [];
    const toItem = (papel: string) => (pt: Party) => ({
      papel,
      nome: pt.name,
      documento: pt.document ?? "",
      proc:
        pt.counsels.length > 0
          ? pt.counsels
              .map((c) => (c.oab ? `${c.name} (OAB/${c.uf} ${c.oab})` : c.name))
              .join(" · ")
          : "",
    });
    return [
      ...data.autor.map(toItem("Autor")),
      ...data.reu.map(toItem("Réu")),
      ...data.terceiros.map(toItem("Terceiro")),
    ];
  }, [data]);

  return { partes, isPending: q.isPending };
}

// Andamentos (linha do tempo DATAJUD) → itens data/texto + paginação incremental.
function useAndamentos_private(id: string) {
  const q = useAndamentosDoProcesso(id);

  const andamentos: AndamentoItemVM[] = useMemo(
    () =>
      q.andamentos.map((a) => ({
        id: a.id,
        data: formatDate(a.occurred_at),
        texto: a.text,
      })),
    [q.andamentos],
  );

  return {
    andamentos,
    total: q.totalCount,
    isPending: q.isPending,
    hasMore: q.hasNextPage,
    isLoadingMore: q.isFetchingNextPage,
    loadMore: () => q.fetchNextPage(),
  };
}

// Referência: intimações e prazos do processo (as tarefas saíram do cockpit).
function useReferencias_private(id: string) {
  const intimacoesQ = useIntimacoesByProcesso(id);
  const prazosQ = usePrazosByProcesso(id);

  const intimacoes: IntimacaoItemVM[] = useMemo(
    () =>
      (intimacoesQ.data ?? []).map((i) => {
        const prazo = i.prazo;
        return {
          id: i.id,
          titulo: i.class || i.subject || i.type,
          status:
            prazo && !prazo.confirmed ? "A confirmar" : "Intimação recebida",
          resp: i.assignee_user_name,
          fatal: prazo ? formatDate(prazo.end_date) : "",
          prazoCurto: prazo ? prazoCurto(prazo.days_left) : null,
          urgNivel: prazo ? urgNivelPorDias(prazo.days_left) : 0,
          urgCor: prazo ? urgCorPorDias(prazo.days_left) : "var(--fg3)",
        };
      }),
    [intimacoesQ.data],
  );

  const prazos: PrazoItemVM[] = useMemo(
    () =>
      prazosQ.prazos.map((p) => ({
        id: p.id,
        kind: p.kind,
        interno: p.start_date ? formatDate(p.start_date) : "",
        fatal: formatDate(p.end_date),
        prazoCurto: prazoCurto(p.days_left),
        urgNivel: urgNivelPorDias(p.days_left),
        urgCor: urgCorPorDias(p.days_left),
      })),
    [prazosQ.prazos],
  );

  return {
    intimacoes,
    prazos,
    isPending: intimacoesQ.isPending || prazosQ.isPending,
  };
}

// Autos do processo (documentos) → itens do card AUTOS. O código eproc do tipo vem
// hoje no `title` do DocumentView; traduzimos para rótulo pt-BR e somamos as páginas
// para as folhas do cabeçalho.
function useAutos_private(id: string): AutosVM {
  const q = useDocumentosDoProcesso(id);
  const abrir = useCallback(
    (documentoId: string) => q.baixar.mutate(documentoId),
    [q.baixar],
  );

  return useMemo(() => {
    const itens: AutoItemVM[] = q.documentos.map((d) => {
      // O fetch novo já grava um título amigável (e o código cru em document_type);
      // aí exibimos o título direto. Docs legados vinham com o código no title e
      // document_type vazio — nesses, o mapa do FE traduz. (fallback compatível)
      const codigo = d.document_type || d.title;
      const titulo = d.document_type
        ? d.title
        : rotuloTipoAuto(d.title || d.document_type);
      // Uploads avulsos: "Documento · Enviado" (verde). Autos: categoria+origem+cor
      // derivados do código do tipo (visualDoAuto).
      const vis = visualDoAuto(codigo);
      const enviado = d.origin === "UPLOAD";
      return {
        id: d.id,
        titulo,
        sub: enviado
          ? "Documento · Enviado"
          : `${vis.categoria} · ${vis.origem}`,
        cor: enviado ? "var(--green)" : vis.cor,
        fls: d.pages ? `${d.pages} fls.` : "",
        processando: d.status !== "READY" && d.status !== "FAILED",
      };
    });
    const folhas = q.documentos.reduce((acc, d) => acc + (d.pages ?? 0), 0);
    return {
      itens,
      total: q.documentos.length,
      folhas,
      isPending: q.isPending,
      isEmpty: q.documentos.length === 0,
      abrir,
    };
  }, [q.documentos, q.isPending, abrir]);
}

// Peças do processo → itens do card PEÇAS (título, data, badge de status).
function usePecas_private(id: string): PecasVM {
  const q = usePecasByProcesso(id);

  return useMemo(() => {
    const itens: PecaItemVM[] = q.items.map((p) => {
      const st = pecaStatusInfo(p.status);
      const rotulo = rotuloTipoPeca(p.piece_type);
      const titulo = p.title || rotulo;
      return {
        id: p.id,
        titulo,
        sub: rotulo,
        cor: corDaPeca(p.piece_type),
        data: formatDate(p.created_at),
        statusLabel: st.label,
        statusCor: st.cor,
        statusFundo: st.fundo,
      };
    });
    return {
      itens,
      total: itens.length,
      isPending: q.isPending,
      isEmpty: itens.length === 0,
    };
  }, [q.items, q.isPending]);
}

// ── Hook público — compõe os sub-hooks e monta a VM ─────────────────────────────

export function useProcessoHub(id: string) {
  const identidade = useIdentidade_private(id);
  const responsavel = useResponsavel_private(
    id,
    identidade.processo?.assigned_user_id ?? null,
  );
  const partes = usePartes_private(id);
  const andamentos = useAndamentos_private(id);
  const referencias = useReferencias_private(id);
  const autos = useAutos_private(id);
  const pecas = usePecas_private(id);

  // Título grande do cockpit = o CLIENTE (parte do polo ativo), como no design;
  // cai na classe processual enquanto as partes não carregaram.
  const identity = useMemo(() => {
    const base = identidade.identity;
    if (!base) return base;
    const cliente = partes.partes.find((p) => p.papel === "Autor")?.nome;
    return cliente ? { ...base, titulo: cliente } : base;
  }, [identidade.identity, partes.partes]);

  // Edição manual da fase (override) e do valor da causa — PATCH parcial.
  const updateMut = useUpdateProcessoManual(id);
  const salvarFase = useCallback(
    (phase: ProcessoPhase) => updateMut.mutate({ phase }),
    [updateMut],
  );
  const salvarValor = useCallback(
    (claimValue: number) => updateMut.mutate({ claim_value: claimValue }),
    [updateMut],
  );

  // Stepper: 5 passos; done/current/todo pela fase efetiva; clicar seta a fase (override manual).
  const fase = identity?.phase ?? null;
  const stepper: FaseStepVM[] = useMemo(() => {
    const atual = fase ? FASE_STEPS.findIndex((s) => s.key === fase) : -1;
    return FASE_STEPS.map((s, i) => ({
      key: s.key,
      label: s.label,
      estado:
        atual < 0
          ? "todo"
          : i < atual
            ? "done"
            : i === atual
              ? "current"
              : "todo",
      onClick: () => salvarFase(s.key),
    }));
  }, [fase, salvarFase]);

  // O nome do responsável pode vir já anexado pelo BE (assigned_user_name); nesse
  // caso preferimos ele ao resolvido pelo diretório.
  const responsavelVM: ResponsavelVM = useMemo(() => {
    const anexado = identidade.processo?.assigned_user_name;
    if (anexado) {
      return {
        nome: anexado,
        iniciais: iniciais(anexado),
        assignedUserId: identidade.processo?.assigned_user_id ?? null,
      };
    }
    return responsavel.responsavel;
  }, [
    identidade.processo?.assigned_user_name,
    identidade.processo?.assigned_user_id,
    responsavel.responsavel,
  ]);

  return {
    isLoading: identidade.isLoading,
    isError: identidade.isError,
    naoEncontrado: identidade.naoEncontrado,

    identity,

    // fase (stepper) + valor da causa, editáveis à mão
    stepper,
    salvarFase,
    salvarValor,
    salvandoManual: updateMut.isPending,

    responsavel: responsavelVM,
    members: responsavel.members,
    assign: responsavel.assign,
    isAssigning: responsavel.isAssigning,

    partes: partes.partes,
    partesPending: partes.isPending,

    autos,
    pecas,

    andamentos: andamentos.andamentos,
    andamentosTotal: andamentos.total,
    andamentosPending: andamentos.isPending,
    andamentosHasMore: andamentos.hasMore,
    andamentosLoadingMore: andamentos.isLoadingMore,
    andamentosLoadMore: andamentos.loadMore,

    intimacoes: referencias.intimacoes,
    prazos: referencias.prazos,
    referenciasPending: referencias.isPending,

    voltarLabel: "Processos",
    voltarHref: "/processos",
  };
}
