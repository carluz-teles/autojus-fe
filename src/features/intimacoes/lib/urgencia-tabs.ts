// Tabs de urgência — fonte ÚNICA da fila temporal (rótulo + valor de wire
// ?urgencia= + chave do bucket de contagem). Consumida pelo master-detail de
// Intimações (IntimacoesView) E pela Triagem (segunda fileira de pills, "Por
// urgência"). Regra nº1: uma só fonte, não duplicar o closed set em dois lugares.
//
// O valor de wire de "Esta semana" é "semana" — só o NOME do campo no envelope
// `buckets` é "esta_semana" (ver types.ts). São seis tabs; mais_adiante fica de
// fora (calculado no BE, mas não é tab).

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
