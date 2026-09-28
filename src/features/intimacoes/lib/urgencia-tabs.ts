// Tabs de urgência — fonte ÚNICA da fila temporal (rótulo + valor de wire
// ?urgencia= + chave do bucket de contagem). Consumida pelo master-detail de
// Intimações (IntimacoesView) E pela Triagem (segunda fileira de pills, "Por
// urgência"). Regra nº1: uma só fonte, não duplicar o closed set em dois lugares.
//
// O valor de wire de "Esta semana" é "semana" — só o NOME do campo no envelope
// `buckets` é "esta_semana" (ver types.ts). São seis tabs; mais_adiante fica de
// fora (calculado no BE, mas não é tab).

import type { FilterTab } from "../components/shared/filter-tabs";
import type { IntimacoesBuckets } from "../types";

export interface UrgenciaTab {
  /** Valor enviado em ?urgencia= (closed set do BE). */
  value: string;
  label: string;
  /** Chave do envelope `buckets` que traz a contagem real. */
  bucketKey: keyof IntimacoesBuckets;
}

export const URGENCIA_TABS: UrgenciaTab[] = [
  { value: "atraso", label: "Em atraso", bucketKey: "atraso" },
  { value: "hoje", label: "Hoje", bucketKey: "hoje" },
  {
    value: "proximos_dois_dias",
    label: "Próximos 2 dias",
    bucketKey: "proximos_dois_dias",
  },
  { value: "semana", label: "Esta semana", bucketKey: "esta_semana" },
  { value: "este_mes", label: "Este mês", bucketKey: "este_mes" },
  {
    value: "sem_data_definida",
    label: "Sem data",
    bucketKey: "sem_data_definida",
  },
];

// Rótulos HONESTOS dos buckets DISJUNTOS (o BE particiona o tempo; não são faixas
// cumulativas). "Esta semana" (wire=semana) é na verdade "Em 3–7 dias"; "Este mês"
// (wire=este_mes) é "Após 7 dias, neste mês". Fonte ÚNICA — usada pelo builder abaixo.
const RELABEL_URGENCIA: Record<string, string> = {
  semana: "Em 3–7 dias",
  este_mes: "Após 7 dias, neste mês",
};

/** Rótulo canônico de um valor de wire ?urgencia= (inclui Todas e mais_adiante).
 *  Fonte única do texto — usada nos chips de filtro ativo (Mesa e histórico). */
export function rotuloUrgencia(value: string): string {
  if (!value) return "Todas";
  if (value === "mais_adiante") return "Após este mês";
  const tab = URGENCIA_TABS.find((t) => t.value === value);
  return tab ? (RELABEL_URGENCIA[tab.value] ?? tab.label) : value;
}

export interface ConstruirUrgencyTabsInput {
  /** Contagens reais do servidor (envelope da lista), não a página carregada. */
  buckets: IntimacoesBuckets;
  /** "Todas" — total do recorte sem o filtro de urgência aplicado. */
  totalWithoutUrgency: number;
  /** Valor de wire ?urgencia= ativo ("" = Todas). */
  urgency: string;
  /** Há intervalo de datas (due_from/due_to) ativo — desativa "Todas". */
  temIntervalo: boolean;
  /** "" seleciona Todas (limpa); qualquer outro valor é o wire ?urgencia=. */
  onSelecionar: (value: string) => void;
  /** Inclui o atalho "Sem data" (sem_data_definida). Default true; a Mesa passa false. */
  incluirSemData?: boolean;
}

/** Constrói as tabs de urgência (Todas + buckets disjuntos + "Após este mês") com
 *  contagens reais e rótulos honestos. FONTE ÚNICA consumida pelo histórico de
 *  Intimações E pela Mesa de Trabalho — não duplicar o mapeamento em cada hook. */
export function construirUrgencyTabs({
  buckets,
  totalWithoutUrgency,
  urgency,
  temIntervalo,
  onSelecionar,
  incluirSemData = true,
}: ConstruirUrgencyTabsInput): FilterTab[] {
  const temporais = URGENCIA_TABS.filter(
    (t) => incluirSemData || t.value !== "sem_data_definida",
  );
  return [
    {
      key: "",
      label: "Todas",
      count: totalWithoutUrgency,
      ativo: !urgency && !temIntervalo,
      onClick: () => onSelecionar(""),
    },
    ...temporais.map((t) => ({
      key: t.value,
      label: RELABEL_URGENCIA[t.value] ?? t.label,
      count: buckets[t.bucketKey],
      ativo: urgency === t.value,
      onClick: () => onSelecionar(t.value),
    })),
    {
      key: "mais_adiante",
      label: "Após este mês",
      count: buckets.mais_adiante,
      ativo: urgency === "mais_adiante",
      onClick: () => onSelecionar("mais_adiante"),
    },
  ];
}
