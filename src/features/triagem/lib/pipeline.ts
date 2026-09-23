// Mapeamento IntimacaoView (read model do BE) → props das linhas densas da
// Triagem-pipeline. Fonte ÚNICA da tradução "linha real → UI da pipeline" (Regra
// nº1): o componente de apresentação não conhece o shape do BE; a view não repete
// derivação. Os sinais U0 (categoria_coarse/acionabilidade/provisorio/lifecycle/
// is_excecao/excecao_motivo) já vêm prontos do BE — aqui só rotulamos e derivamos
// urgência a partir do prazo (mesma regra da listagem: estado.ts/lib/listagem.ts).

import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { formatarData } from "@/lib/utils";

import {
  estadoIntimacao,
  type IntimacaoEstado,
} from "../../intimacoes/lib/estado";
import { tipoAtoLabel } from "../../intimacoes/lib/tipo-ato";
import type {
  IntimacaoCategoriaCoarse,
  IntimacaoDisposicao,
  IntimacaoExcecaoMotivo,
  IntimacaoView,
  RecommendedProvidencia,
} from "../../intimacoes/types";

/** Rótulo pt-BR da categoria coarse — o chip grosso da linha. Diretiva app-wide:
 *  nunca citar "IA" no texto (não se aplica aqui, mas mantém a convenção). */
export const CATEGORIA_COARSE_LABEL: Record<IntimacaoCategoriaCoarse, string> =
  {
    recurso: "Recurso",
    manifestacao: "Manifestação",
    ciencia: "Ciência",
    despacho: "Despacho/Decisão",
    intimacao: "Intimação",
    outros: "Outros",
  };

/** Motivo da exceção → texto humano (tooltip do marcador ⚠). "" nunca deveria
 *  chegar aqui (só chamamos quando is_excecao), mas cai num fallback seguro. */
export const EXCECAO_MOTIVO_LABEL: Record<IntimacaoExcecaoMotivo, string> = {
  provisorio: "Prazo provisório (piso supletivo) — confirme a contagem.",
  ia_inferido: "Tipo de ato inferido — revise antes de confirmar.",
  divergente: "Divergência entre a publicação e o cálculo do prazo.",
  "": "Precisa de revisão.",
};

/** Segmento da linha = a DISPOSIÇÃO disjunta do BE (docs/erd-intimacao-triagem §4).
 *  Exceção é seu próprio segmento (disjunto de "trabalhar"), então "Pra trabalhar" não
 *  mistura mais exceção/ciência. Deriva 1:1 de IntimacaoView.disposicao (fonte única do BE). */
export type PipelineSegment =
  "trabalhar" | "excecao" | "ciencia" | "sem-prazo" | "analisando";

export function segmentDaDisposicao(d: IntimacaoDisposicao): PipelineSegment {
  switch (d) {
    case "trabalho":
      return "trabalhar";
    case "excecao":
      return "excecao";
    case "ciencia":
      return "ciencia";
    case "sem_prazo":
      return "sem-prazo";
    case "analisando":
      return "analisando";
  }
}

/** Tom de urgência do prazo, reusando a mesma leitura de days_left da listagem. */
export type PipelinePrazoTone = "vencido" | "urgente" | "futuro" | "sem-prazo";

function toneDoPrazo(daysLeft: number | null): PipelinePrazoTone {
  if (daysLeft === null) return "sem-prazo";
  if (daysLeft < 0) return "vencido";
  if (daysLeft <= 6) return "urgente";
  return "futuro";
}

function relativoDoPrazo(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d atraso`;
  if (daysLeft === 0) return "hoje";
  if (daysLeft === 1) return "1d";
  return `${daysLeft}d`;
}

/** Prazo pronto pra render na pill: data curta, relativo, tom e o dual date interno. */
export interface PipelinePrazo {
  tone: PipelinePrazoTone;
  /** Fatal em ISO (YYYY-MM-DD) — usado no filtro de intervalo; "" quando sem prazo. */
  fatalISO: string;
  /** DD/MM do fatal; "" quando sem prazo. */
  fatalCurto: string;
  /** Fatal por extenso (DD/MM/AAAA) — title da pill. "" quando sem prazo. */
  fatalLongo: string;
  /** "hoje" / "3d" / "8d atraso" — vazio quando sem prazo. */
  relativo: string;
  /** DD/MM do prazo interno; "" quando não materializado ou sem prazo. */
  internoCurto: string;
  provisorio: boolean;
}

/** Props de uma linha densa da fila "A triar" — o único contrato que os
 *  componentes de apresentação consomem (nada de IntimacaoView solto no JSX). */
export interface PipelineRow {
  id: string;
  /** Deep-link ao processo/intimação. */
  courtRecordId: string;
  categoriaLabel: string;
  categoria: IntimacaoCategoriaCoarse;
  /** Título serif — o mesmo builder do read model (title já vem do BE). */
  title: string;
  /** Meta mono: "CNJ · Tribunal · Grau". */
  meta: string;
  /** O ato/o-que-fazer, rotulado (tipoAtoLabel). */
  ato: string;
  geraPeca: boolean;
  prazo: PipelinePrazo;
  segment: PipelineSegment;
  isExcecao: boolean;
  excecaoMotivo: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  /** Estado (desfecho) — chip para as abas Em andamento/Concluído. */
  estado: IntimacaoEstado;
  /** A providência recomendada (id do action_item) — dispara "Gerar peça". */
  rec: RecommendedProvidencia | null;
  /** Instante ISO da conclusão (Concluído); null quando não resolvido. */
  resolvedAt: string | null;
  /** Preview do teor — title do botão de título (hover). */
  preview: string;
}

const DEGREE_LABEL: Record<string, string> = {
  G1: "1º Grau",
  G2: "2º Grau",
  JE: "Juizado",
  SUPERIOR: "Superior",
  UNKNOWN: "",
};

export function pipelineRow(i: IntimacaoView): PipelineRow {
  const p = i.prazo;
  const daysLeft = p && p.status !== "NO_DEADLINE" ? p.days_left : null;
  const grau = DEGREE_LABEL[i.degree] ?? "";
  const rec =
    i.recommended_providencia &&
    !!p &&
    ["PENDING", "OPEN"].includes(p.status) &&
    p.days_left >= 0
      ? i.recommended_providencia
      : null;
  // Chip coerente com o segmento (docs/erd-intimacao-triagem §5, §11): o chip é a categoria
  // coarse, MAS um item acionável (trabalho/excecao) NUNCA mostra "Ciência" — se o
  // document_type disser ciência num item que o motor marcou acionável (ex.: Ato ordinatório
  // com "manifeste-se"), mostramos o ATO. Analisando (motor não classificou) vira chip neutro.
  const acionavel = i.disposicao === "trabalho" || i.disposicao === "excecao";
  let chipCategoria: IntimacaoCategoriaCoarse = i.categoria_coarse;
  let chipLabel =
    CATEGORIA_COARSE_LABEL[i.categoria_coarse] ?? CATEGORIA_COARSE_LABEL.outros;
  if (i.disposicao === "analisando") {
    chipCategoria = "outros";
    chipLabel = "Analisando";
  } else if (acionavel && i.categoria_coarse === "ciencia") {
    chipCategoria = "manifestacao";
    chipLabel = p?.tipo_ato ? tipoAtoLabel(p.tipo_ato) : "Providência";
  }
  return {
    id: i.id,
    courtRecordId: i.court_record_id,
    categoria: chipCategoria,
    categoriaLabel: chipLabel,
    title: i.title.replace(/\s*·\s*$/, ""),
    meta: [formatarCNJ(i.cnj_number), i.court, grau]
      .filter(Boolean)
      .join(" · "),
    ato: p?.tipo_ato ? tipoAtoLabel(p.tipo_ato) : "Tipo a definir",
    // Alinhado ao `rec` GUARDADO (só oferece peça com prazo ativo e não-vencido): o badge
    // e o botão inline usam isto, então não sobra "Peça" morto num prazo vencido (QA D4).
    geraPeca: !!rec?.gera_peca,
    prazo: {
      tone: toneDoPrazo(daysLeft),
      fatalISO: daysLeft !== null && p ? p.end_date.slice(0, 10) : "",
      fatalCurto:
        daysLeft !== null && p ? formatarData(p.end_date).slice(0, 5) : "",
      fatalLongo: daysLeft !== null && p ? formatarData(p.end_date) : "",
      relativo: daysLeft !== null ? relativoDoPrazo(daysLeft) : "",
      internoCurto: p?.prazo_interno
        ? formatarData(p.prazo_interno).slice(0, 5)
        : "",
      provisorio: i.provisorio,
    },
    segment: segmentDaDisposicao(i.disposicao),
    isExcecao: i.is_excecao,
    excecaoMotivo: i.is_excecao
      ? (EXCECAO_MOTIVO_LABEL[i.excecao_motivo] ?? EXCECAO_MOTIVO_LABEL[""])
      : "",
    responsavelId: i.assignee_user_id,
    responsavelNome: i.assignee_user_name,
    estado: estadoIntimacao(i),
    rec,
    resolvedAt: i.resolved_at,
    preview: i.content_preview,
  };
}
