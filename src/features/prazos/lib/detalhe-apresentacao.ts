import { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";

import type { PrazoDetalheView } from "../types";
import { tipoIncompativelComPrazo, tipoIndeterminado } from "./confirmacao";

const REVIEW_ORIGIN_LABEL: Record<string, string> = {
  generic_fallback: "Base genérica provisória",
  declared: "Informado na publicação",
  declarado: "Informado na publicação",
  manual: "Ajustado manualmente",
  calculado: "Calculado pelas regras",
  rule: "Calculado pelas regras",
  deterministico: "Classificado pelo texto",
  ia: "Sugerido pela análise",
  divergente: "Fontes divergentes",
  no_deadline: "Sem prazo identificado",
};

export function origemRevisaoLabel(origin: string | null): string {
  return origin ? (REVIEW_ORIGIN_LABEL[origin] ?? "Origem não informada") : "";
}

export function motivoRevisaoLabel(
  origin: string | null,
  reason: string,
): string {
  if (origin === "generic_fallback" && /base genérica/i.test(reason)) {
    return "Confira a contagem antes de confirmar.";
  }
  return reason;
}

export function tipoRevisaoLabel(
  tipo: string | null | undefined,
  catalogLabel?: string | null,
): string {
  if (!tipo || tipo === "indeterminado") return "A definir";
  if (catalogLabel) return catalogLabel;
  const label = tipoAtoLabel(tipo);
  return label === "Prazo" ? "Tipo registrado" : label;
}

export function formatarCNJ(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 20
    ? digits.replace(
        /^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/,
        "$1-$2.$3.$4.$5.$6",
      )
    : value;
}

export function documentoOrigemUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function feriadosVigentes(p: PrazoDetalheView) {
  if (p.calculation_audit_status !== "current" || !p.current_calculation)
    return [];
  return p.current_calculation.holidays_applied.map((data) => ({
    data,
    nome: "Feriado ou suspensão",
    ambito: "",
  }));
}

export function dataEscolhidaNaApuracao(p: PrazoDetalheView): boolean {
  return ["aceita_calculado", "ajuste_manual"].includes(
    p.cross_validation?.decisao ?? "",
  );
}

export function situacaoRevisao(p: PrazoDetalheView | null, estado: string) {
  if (!p) return { label: "Prazo não disponível", pendente: false };
  if (p.review) {
    const pendente =
      p.review.tipo.status === "pending" || p.review.prazo.status === "pending";
    return {
      label: pendente ? "Revisão pendente" : "Revisão em dia",
      pendente,
    };
  }
  if (p.status === "CANCELLED")
    return { label: "Prazo cancelado", pendente: false };
  if (p.status === "MET") return { label: "Prazo cumprido", pendente: false };
  if (
    p.origem !== "declarado" &&
    p.cross_validation?.resultado === "divergente" &&
    !p.cross_validation.decisao
  )
    return { label: "Divergência pendente", pendente: true };
  if (p.confirmed)
    return {
      label:
        p.status === "NO_DEADLINE"
          ? "Ausência de prazo revisada"
          : "Prazo revisado",
      pendente: false,
    };
  if (tipoIncompativelComPrazo(p))
    return { label: "Tipo incompatível com prazo · revisar", pendente: true };
  if (estado === "a_classificar")
    return {
      label:
        p.origem === "declarado" ? "Tipo a definir" : "Tipo e prazo a definir",
      pendente: true,
    };
  if (estado === "ia")
    return {
      label:
        p.origem === "declarado"
          ? "Tipo a confirmar"
          : "Tipo e prazo a confirmar",
      pendente: true,
    };
  if (p.status === "NO_DEADLINE")
    return { label: "Sem prazo identificado", pendente: false };
  if (p.origem === "declarado")
    return { label: "Prazo declarado aceito", pendente: false };
  // EXCEÇÃO DE CLASSIFICAÇÃO: o piso supletivo (CPC 218§3) assumiu uma data
  // defensável (`selo='a_apurar'`) porque o tipo do ato não foi identificado
  // — não é "revisão" genérica nem ausência de item (que não é desacordo),
  // é uma causa concreta e nomeável. O rótulo genérico "Revisão pendente" cede
  // pra essa causa específica sempre que ela se aplica; `pendente` continua
  // `true` (nunca `false` cosmético) — a intimação permanece em exceção até o
  // tipo ser de fato definido (ou marcado como sem prazo), não até o rótulo
  // mudar. Não confundir com a divergência prazo×obrigação (caso 0b81 — item
  // de ciência real + acionabilidade='ato'): aqui não há item nenhum, o eixo é
  // outro (tipificação), resolvido pelo mesmo control `DefinirTipoAto`.
  if (p.selo === "a_apurar" && tipoIndeterminado(p, estado))
    return { label: "Tipo do ato não identificado", pendente: true };
  return {
    label: p.confirmacao_exigida
      ? "Revisão pendente"
      : "Sem pendência de revisão",
    pendente: p.confirmacao_exigida,
  };
}
